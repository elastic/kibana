import { compose } from './lib/compose/kibana';
import { initManagementServer } from './management_server';
import { Server } from 'hapi';

export const initServerWithKibana = (hapiServer: Server) => {
  const libs = compose(hapiServer);
  initManagementServer(libs);
};
