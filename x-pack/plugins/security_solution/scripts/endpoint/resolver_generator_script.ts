/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console,max-classes-per-file */
import yargs from 'yargs';
import fs from 'fs';
import { Client, errors } from '@elastic/elasticsearch';
import type { ClientOptions } from '@elastic/elasticsearch/lib/client';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { ToolingLog } from '@kbn/tooling-log';
import type { KbnClientOptions } from '@kbn/test';
import { KbnClient } from '@kbn/test';
import type { Role } from '@kbn/security-plugin/common';
import type { AxiosResponse } from 'axios';
import { METADATA_DATASTREAM } from '../../common/endpoint/constants';
import { EndpointMetadataGenerator } from '../../common/endpoint/data_generators/endpoint_metadata_generator';
import { indexHostsAndAlerts } from '../../common/endpoint/index_data';
import { ANCESTRY_LIMIT, EndpointDocGenerator } from '../../common/endpoint/generate_data';
import { fetchStackVersion } from './common/stack_services';
import { ENDPOINT_ALERTS_INDEX, ENDPOINT_EVENTS_INDEX } from './common/constants';
import {
  noResponseActionsRole,
  noResponseActionsUser,
  withResponseActionsRole,
  withResponseActionsUser,
} from './common/roles_users';

main();

function handleErr(err: unknown) {
  if (err instanceof errors.ResponseError && err.statusCode !== 404) {
    console.log(JSON.stringify(err, null, 2));
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
}

async function deleteIndices(indices: string[], client: Client) {
  for (const index of indices) {
    try {
      // The index could be a data stream so let's try deleting that first
      // The ES client in Kibana doesn't support data streams yet so we need to make a raw request to the ES route
      await client.transport.request({ method: 'DELETE', path: `_data_stream/${index}` });
    } catch (err) {
      handleErr(err);
    }
  }
}

interface RoleInfo {
  role: string;
}

async function addRole(kbnClient: KbnClient, role: RoleInterface): Promise<RoleInfo | undefined> {
  if (!role) {
    return;
  }
  const path = `/api/security/role/${role.roleName}?createOnly=true`;

  // add role if doesn't exist already
  try {
    console.log(`Adding ${role.roleName} role`);

    const addedRole = (
      (await kbnClient.request<Promise<Role>>({
        method: 'PUT',
        path,
        body: role,
      })) as AxiosResponse
    ).data;

    return {
      roleName: role.roleName,
    };
  } catch (error) {
    console.log(error);
    handleErr(error);
  }
}

interface UserInfo {
  username: string;
  password: string;
}

async function addUser(
  esClient: Client,
  user?: { username: string; password: string },
  roles?: string[]
): Promise<UserInfo | undefined> {
  if (!user) {
    return;
  }

  const superuserRole = ['superuser', 'kibana_system'];
  const path = `_security/user/${user.username}`;
  // add user if doesn't exist already
  try {
    console.log(`Adding ${user.username}...`);
    const addedUser = await esClient.transport.request<Promise<{ created: boolean }>>({
      method: 'POST',
      path,
      body: {
        password: user.password,
        roles: roles ?? superuserRole,
        full_name: user.username,
      },
    });
    if (addedUser.created) {
      console.log(`User ${user.username} added successfully!`);
    } else {
      console.log(`User ${user.username} already exists!`);
    }
    return {
      username: user.username,
      password: user.password,
    };
  } catch (error) {
    handleErr(error);
  }
}

async function deleteUser(esClient: Client, username: string): Promise<{ found: boolean }> {
  return esClient.transport.request({
    method: 'DELETE',
    path: `_security/user/${username}`,
  });
}

function updateURL({
  url,
  user,
  protocol,
}: {
  url: string;
  user?: { username: string; password: string };
  protocol?: string;
}): string {
  const urlObject = new URL(url);
  if (user) {
    urlObject.username = user.username;
    urlObject.password = user.password;
  }
  if (protocol) {
    urlObject.protocol = protocol;
  }
  return urlObject.href;
}

async function main() {
  const argv = yargs.help().options({
    seed: {
      alias: 's',
      describe: 'random seed to use for document generator',
      type: 'string',
    },
    node: {
      alias: 'n',
      describe: 'elasticsearch node url',
      default: 'http://elastic:changeme@localhost:9200',
      type: 'string',
    },
    kibana: {
      alias: 'k',
      describe: 'kibana url',
      default: 'http://elastic:changeme@localhost:5601',
      type: 'string',
    },
    eventIndex: {
      alias: 'ei',
      describe: 'index to store events in',
      default: ENDPOINT_EVENTS_INDEX,
      type: 'string',
    },
    alertIndex: {
      alias: 'ai',
      describe: 'index to store alerts in',
      default: ENDPOINT_ALERTS_INDEX,
      type: 'string',
    },
    metadataIndex: {
      alias: 'mi',
      describe: 'index to store host metadata in',
      default: METADATA_DATASTREAM,
      type: 'string',
    },
    policyIndex: {
      alias: 'pi',
      describe: 'index to store host policy in',
      default: 'metrics-endpoint.policy-default',
      type: 'string',
    },
    ancestors: {
      alias: 'anc',
      describe: 'number of ancestors of origin to create',
      type: 'number',
      default: 3,
    },
    ancestryArraySize: {
      alias: 'ancSize',
      describe: 'the upper bound size of the ancestry array, 0 will mark the field as undefined',
      type: 'number',
      default: ANCESTRY_LIMIT,
    },
    generations: {
      alias: 'gen',
      describe: 'number of child generations to create',
      type: 'number',
      default: 3,
    },
    children: {
      alias: 'ch',
      describe: 'maximum number of children per node',
      type: 'number',
      default: 3,
    },
    relatedEvents: {
      alias: 'related',
      describe: 'number of related events to create for each process event',
      type: 'number',
      default: 5,
    },
    relatedAlerts: {
      alias: 'relAlerts',
      describe: 'number of related alerts to create for each process event',
      type: 'number',
      default: 5,
    },
    percentWithRelated: {
      alias: 'pr',
      describe: 'percent of process events to add related events and related alerts to',
      type: 'number',
      default: 30,
    },
    percentTerminated: {
      alias: 'pt',
      describe: 'percent of process events to add termination event for',
      type: 'number',
      default: 30,
    },
    maxChildrenPerNode: {
      alias: 'maxCh',
      describe:
        'always generate the max number of children per node instead of it being random up to the max children',
      type: 'boolean',
      default: false,
    },
    numHosts: {
      alias: 'ne',
      describe: 'number of different hosts to generate alerts for',
      type: 'number',
      default: 1,
    },
    numDocs: {
      alias: 'nd',
      describe: 'number of metadata and policy response doc to generate per host',
      type: 'number',
      default: 5,
    },
    alertsPerHost: {
      alias: 'ape',
      describe: 'number of resolver trees to make for each host',
      type: 'number',
      default: 1,
    },
    delete: {
      alias: 'd',
      describe: 'delete indices and remake them',
      type: 'boolean',
      default: false,
    },
    fleet: {
      alias: 'f',
      describe: 'enroll fleet agents for hosts',
      type: 'boolean',
      default: false,
    },
    ssl: {
      alias: 'ssl',
      describe: 'Use https for elasticsearch and kbn clients',
      type: 'boolean',
      default: false,
    },
    withNewUser: {
      alias: 'wnu',
      describe:
        'If the --fleet flag is enabled, using `--withNewUser=username:password` would add a new user with \
         the given username, password and `superuser`, `kibana_system` roles. Adding a new user would also write \
        to indices in the generator as this user with the new roles.',
      type: 'string',
      default: '',
    },
    randomVersions: {
      describe:
        'By default, the data generated (that contains a stack version - ex: `agent.version`) will have a ' +
        'version number set to be the same as the version of the running stack. Using this flag (`--randomVersions=true`) ' +
        'will result in random version being generated',
      default: false,
    },
    rbacUser: {
      alias: 'rbac',
      describe: 'Creates 2 users with the following kibana permissions',
      type: 'string',
      default: '',
    },
  }).argv;
  let ca: Buffer;

  let clientOptions: ClientOptions;
  let url: string;
  let node: string;
  const toolingLogOptions = {
    log: new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    }),
  };

  let kbnClientOptions: KbnClientOptions = {
    ...toolingLogOptions,
    url: argv.kibana,
  };

  if (argv.ssl) {
    ca = fs.readFileSync(CA_CERT_PATH);
    url = updateURL({ url: argv.kibana, protocol: 'https:' });
    node = updateURL({ url: argv.node, protocol: 'https:' });
    kbnClientOptions = {
      ...kbnClientOptions,
      url,
      certificateAuthorities: [ca],
    };

    clientOptions = { node, tls: { ca: [ca] } };
  } else {
    clientOptions = { node: argv.node };
  }
  let client = new Client(clientOptions);
  let user: UserInfo | undefined;
  // if fleet flag is used
  if (argv.fleet) {
    // add endpoint user if --withNewUser flag has values as username:password
    const newUserCreds =
      argv.withNewUser.indexOf(':') !== -1 ? argv.withNewUser.split(':') : undefined;
    user = await addUser(
      client,
      newUserCreds
        ? {
            username: newUserCreds[0],
            password: newUserCreds[1],
          }
        : undefined
    );

    // update client and kibana options before instantiating
    if (user) {
      // use endpoint user for Es and Kibana URLs

      url = updateURL({ url: argv.kibana, user });
      node = updateURL({ url: argv.node, user });

      kbnClientOptions = {
        ...kbnClientOptions,
        url,
      };
      client = new Client({ ...clientOptions, node });
    }
  }
  // instantiate kibana client
  const kbnClient = new KbnClient({ ...kbnClientOptions });

  if (argv.delete) {
    await deleteIndices(
      [argv.eventIndex, argv.metadataIndex, argv.policyIndex, argv.alertIndex],
      client
    );
  }

  if (argv.rbacUser) {
    const newRoleData = argv.rbacUser;
    const role = await addRole(kbnClient, newRoleData ? { roleName: newRoleData } : undefined);
    if (role) {
      console.log(`Successfully added role: ${newRoleData}`);
      const basicUser = await addUser(
        client,
        {
          username: 'withHostIsolation',
          password: 'changeme',
        },
        [newRoleData]
      );
      if (basicUser) {
        console.log('Successfully created basic user');
      } else {
        console.log(`Failed to create user `);
      }
    } else {
      console.log(`Failed to add role, ${newRoleData}`);
    }
  }

  let seed = argv.seed;

  if (!seed) {
    seed = Math.random().toString();
    console.log(`No seed supplied, using random seed: ${seed}`);
  }

  const startTime = new Date().getTime();

  if (argv.fleet && !argv.withNewUser) {
    // warn and exit when using fleet flag
    console.log(
      'Please use the --withNewUser=username:password flag to add a custom user with required roles when --fleet is enabled!'
    );
    // eslint-disable-next-line no-process-exit
    process.exit(0);
  }

  let DocGenerator: typeof EndpointDocGenerator = EndpointDocGenerator;

  // If `--randomVersions` is NOT set, then use custom generator that ensures all data generated
  // has a stack version number that matches that of the running stack
  if (!argv.randomVersions) {
    const stackVersion = await fetchStackVersion(kbnClient);

    // Document Generator override that uses a custom Endpoint Metadata generator and sets the
    // `agent.version` to the current version
    DocGenerator = class extends EndpointDocGenerator {
      constructor(...args: ConstructorParameters<typeof EndpointDocGenerator>) {
        const MetadataGenerator = class extends EndpointMetadataGenerator {
          protected randomVersion(): string {
            return stackVersion;
          }
        };

        super(args[0], MetadataGenerator);
      }
    };
  }

  await indexHostsAndAlerts(
    client,
    kbnClient,
    seed,
    argv.numHosts,
    argv.numDocs,
    argv.metadataIndex,
    argv.policyIndex,
    argv.eventIndex,
    argv.alertIndex,
    argv.alertsPerHost,
    argv.fleet,
    {
      ancestors: argv.ancestors,
      generations: argv.generations,
      children: argv.children,
      relatedEvents: argv.relatedEvents,
      relatedAlerts: argv.relatedAlerts,
      percentWithRelated: argv.percentWithRelated,
      percentTerminated: argv.percentTerminated,
      alwaysGenMaxChildrenPerNode: argv.maxChildrenPerNode,
      ancestryArraySize: argv.ancestryArraySize,
      eventsDataStream: EndpointDocGenerator.createDataStreamFromIndex(argv.eventIndex),
      alertsDataStream: EndpointDocGenerator.createDataStreamFromIndex(argv.alertIndex),
    },
    DocGenerator
  );

  // delete endpoint_user after
  if (user) {
    const deleted = await deleteUser(client, user.username);
    if (deleted.found) {
      console.log(`User ${user.username} deleted successfully!`);
    }
  }
  console.log(`Creating and indexing documents took: ${new Date().getTime() - startTime}ms`);
}
