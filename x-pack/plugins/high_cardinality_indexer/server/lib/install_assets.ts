import { kibanaAssets } from "../data_sources";
import { Config } from '../types';
import { installKibanaAssets } from "./install_kibana_assets";
import { logger } from './logger';

export async function installAssets ({ kibana, indexing }: Config) {
  if (!kibana.installAssets) {
    return Promise.resolve();
  }
  const filePaths = kibanaAssets[indexing.dataset];
  if (filePaths.length) {
    logger.info(`Installing Kibana assets for ${indexing.dataset}`);
    return Promise.all(filePaths.map((path) => installKibanaAssets(path, kibana.host, { username: kibana.username, password: kibana.password })));
  }
  return Promise.resolve();
}

