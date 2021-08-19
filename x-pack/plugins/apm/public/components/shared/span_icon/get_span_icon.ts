/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { maybe } from '../../../../common/utils/maybe';
import awsIcon from './icons/aws.svg';
import darkAwsIcon from './icons/aws_dark.svg';
import azureIcon from './icons/azure.svg';
import cassandraIcon from './icons/cassandra.svg';
import darkCassandraIcon from './icons/cassandra_dark.svg';
import databaseIcon from './icons/database.svg';
import darkDatabaseIcon from './icons/database_dark.svg';
import defaultIcon from './icons/default.svg';
import documentsIcon from './icons/documents.svg';
import darkDocumentsIcon from './icons/documents_dark.svg';
import elasticsearchIcon from './icons/elasticsearch.svg';
import darkElasticsearchIcon from './icons/elasticsearch_dark.svg';
import globeIcon from './icons/globe.svg';
import darkGlobeIcon from './icons/globe_dark.svg';
import graphqlIcon from './icons/graphql.svg';
import grpcIcon from './icons/grpc.svg';
import darkGrpcIcon from './icons/grpc_dark.svg';
import handlebarsIcon from './icons/handlebars.svg';
import darkHandlebarsIcon from './icons/handlebars_dark.svg';
import kafkaIcon from './icons/kafka.svg';
import darkKafkaIcon from './icons/kafka_dark.svg';
import mongodbIcon from './icons/mongodb.svg';
import mysqlIcon from './icons/mysql.svg';
import darkMysqlIcon from './icons/mysql_dark.svg';
import postgresqlIcon from './icons/postgresql.svg';
import redisIcon from './icons/redis.svg';
import websocketIcon from './icons/websocket.svg';
import darkWebsocketIcon from './icons/websocket_dark.svg';
import javaIcon from '../../shared/agent_icon/icons/java.svg';

const defaultSpanTypeIcons: { [key: string]: string } = {
  cache: databaseIcon,
  db: databaseIcon,
  ext: globeIcon,
  external: globeIcon,
  messaging: documentsIcon,
  resource: globeIcon,
};

const defaultDarkSpanTypeIcons: { [key: string]: string } = {
  cache: darkDatabaseIcon,
  db: darkDatabaseIcon,
  ext: darkGlobeIcon,
  external: darkGlobeIcon,
  messaging: darkDocumentsIcon,
  resource: darkGlobeIcon,
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
    cosmosdb: azureIcon,
    dynamodb: awsIcon,
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
  },
  messaging: {
    azurequeue: azureIcon,
    azureservicebus: azureIcon,
    jms: javaIcon,
    kafka: kafkaIcon,
    sns: awsIcon,
    sqs: awsIcon,
  },
  storage: {
    azureblob: azureIcon,
    azurefile: azureIcon,
    azuretable: azureIcon,
    s3: awsIcon,
  },
  template: {
    handlebars: handlebarsIcon,
  },
};

export const darkSpanTypeIcons: {
  [type: string]: { [subtype: string]: string };
} = {
  aws: {
    servicename: darkAwsIcon,
  },
  db: {
    cassandra: darkCassandraIcon,
    dynamodb: darkAwsIcon,
    elasticsearch: darkElasticsearchIcon,
    mysql: darkMysqlIcon,
  },
  external: {
    grpc: darkGrpcIcon,
    websocket: darkWebsocketIcon,
  },
  messaging: {
    kafka: darkKafkaIcon,
    sns: darkAwsIcon,
    sqs: darkAwsIcon,
  },
  storage: {
    s3: darkAwsIcon,
  },
  template: {
    handlebars: darkHandlebarsIcon,
  },
};

export function getSpanIcon(
  isDarkMode: boolean,
  type?: string | undefined,
  subtype?: string | undefined
) {
  if (!type) {
    return defaultIcon;
  }

  const types = maybe(spanTypeIcons[type]);

  if (subtype && types && subtype in types) {
    return types[subtype];
  }
  return (
    (isDarkMode
      ? defaultDarkSpanTypeIcons[type]
      : defaultSpanTypeIcons[type]) ?? defaultIcon
  );
}
