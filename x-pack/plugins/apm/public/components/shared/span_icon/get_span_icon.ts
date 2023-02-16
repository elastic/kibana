/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { maybe } from '../../../../common/utils/maybe';
import awsIcon from './icons/aws.svg';
import cassandraIcon from './icons/cassandra.svg';
import databaseIcon from './icons/database.svg';
import defaultIcon from './icons/default.svg';
import documentsIcon from './icons/documents.svg';
import elasticsearchIcon from './icons/elasticsearch.svg';
import globeIcon from './icons/globe.svg';
import graphqlIcon from './icons/graphql.svg';
import grpcIcon from './icons/grpc.svg';
import handlebarsIcon from './icons/handlebars.svg';
import kafkaIcon from './icons/kafka.svg';
import mongodbIcon from './icons/mongodb.svg';
import mysqlIcon from './icons/mysql.svg';
import postgresqlIcon from './icons/postgresql.svg';
import redisIcon from './icons/redis.svg';
import websocketIcon from './icons/websocket.svg';
import javaIcon from '../agent_icon/icons/java.svg';
import dynamodbIcon from './icons/dynamo_db.svg';
import sThreeIcon from './icons/s3.svg';
import snsIcon from './icons/sns.svg';
import sqsIcon from './icons/sqs.svg';
import cosmosDbIcon from './icons/cosmos_db.svg';
import blobStorageIcon from './icons/blob_storage.svg';
import fileShareStorageIcon from './icons/file_share_storage.svg';
import serviceBusIcon from './icons/service_bus.svg';
import storageQueueIcon from './icons/storage_queue.svg';
import tableStorageIcon from './icons/table_storage.svg';
import ldapIcon from './icons/ldap.svg';

const defaultSpanTypeIcons: { [key: string]: string } = {
  cache: databaseIcon,
  db: databaseIcon,
  ext: globeIcon,
  external: globeIcon,
  messaging: documentsIcon,
  resource: globeIcon,
};

export const spanTypeIcons: {
  [type: string]: { [subtype: string]: string };
} = {
  aws: {
    servicename: awsIcon,
  },
  cache: { redis: redisIcon },
  db: {
    cassandra: cassandraIcon,
    cosmosdb: cosmosDbIcon,
    dynamodb: dynamodbIcon,
    elasticsearch: elasticsearchIcon,
    mongodb: mongodbIcon,
    mysql: mysqlIcon,
    postgresql: postgresqlIcon,
    redis: redisIcon,
  },
  external: {
    graphql: graphqlIcon,
    grpc: grpcIcon,
    websocket: websocketIcon,
    ldap: ldapIcon,
  },
  messaging: {
    azurequeue: storageQueueIcon,
    azureservicebus: serviceBusIcon,
    jms: javaIcon,
    kafka: kafkaIcon,
    sns: snsIcon,
    sqs: sqsIcon,
  },
  storage: {
    azureblob: blobStorageIcon,
    azurefile: fileShareStorageIcon,
    azuretable: tableStorageIcon,
    s3: sThreeIcon,
  },
  template: {
    handlebars: handlebarsIcon,
  },
};

export function getSpanIcon(type?: string, subtype?: string) {
  if (!type) {
    return defaultIcon;
  }

  const types = maybe(spanTypeIcons[type]);

  if (subtype && types && subtype in types) {
    return types[subtype];
  }
  return defaultSpanTypeIcons[type] || defaultIcon;
}
