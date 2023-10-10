import { Client } from '@elastic/elasticsearch';
import { Config } from '../types';

let esClient: Client;

export const getEsClient = (config: Config) => {
  if (esClient) return esClient;

  const auth = config.elasticsearch.apiKey ? { apiKey: config.elasticsearch.apiKey } : {
      username: config.elasticsearch.username,
      password: config.elasticsearch.password,
  };

  esClient = new Client({
    node: config.elasticsearch.host,
    auth,
    ssl: {
      'rejectUnauthorized': false
    }
  });
  return esClient;
};

