# GraphQL In Infra UI

- The combined graphql schema collected from both the `public` and `server` directories is exported to `common/all.gql_schema.ts` for the purpose of automatic type generation only.

## Server

- Under `/server/graphql` there are files for each domain of data's graph schema and resolvers.
  - Each file has 2 exports `${domain}Schema` e.g. `fieldsSchema`, and `create${domain}Resolvers` e.g. `createFieldResolvers`
- `/server/infra_server.ts` imports all schema and resolvers and passing the full schema to the server
- Resolvers should be used to call composed libs, rather than directly performing any meaningful amount of data processing.
- Resolvers should, however, only pass the required data into libs; that is to say all args for example would not be passed into a lib unless all were needed.

## Client

- Under `/public/containers/${domain}/` there is a file for each container. Each file has two exports, the query name e.g. `AllHosts` and the apollo HOC in the pattern of `with${queryName}` e.g. `withAllHosts`. This is done for two reasons:

  1.  It makes the code uniform, thus easier to reason about later.
  2.  If reformatting the data using a transform, it lets us re-type the data clearly.

- Containers should use the apollo props callback to pass ONLY the props and data needed to children. e.g.

  ```ts
    import { Hosts, Pods, HostsAndPods } from '../../common/types';

    // used to generate the `HostsAndPods` type imported above
    export const hostsAndPods = gql`
      # ...
    `;

    type HostsAndPodsProps = {
      hosts: Hosts;
      pods: Pods;
    }

    export const withHostsAndPods = graphql<
      {},
      HostsAndPods.Query,
      HostsAndPods.Variables,
      HostsAndPodsProps
    >(hostsAndPods, {
      props: ({ data, ownProps }) => ({
        hosts: hostForMap(data && data.hosts ? data.hosts : []),
    ￼    pods: podsFromHosts(data && data.hosts ? data.hosts : [])
        ...ownProps,
      }),
    });
  ```

  as `ownProps` are the props passed to the wrapped component, they should just be forwarded.

## Types

- The command `yarn build-graphql-types` derives the schema, query and mutation types and stores them in `common/types.ts` for use on both the client and server.
