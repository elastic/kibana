import {
  BackendFrameworkAdapter,
  FrameworkRequest,
  FrameworkRouteOptions,
  WrappableRequest,
} from '../../../lib';

import { once } from 'lodash';

import { IStrictReply, Request, Server } from 'hapi';
import {
  internalFrameworkRequest,
  wrapRequest,
} from '../../../../utils/wrap_request';

export class InfraKibanaBackendFrameworkAdapter
  implements BackendFrameworkAdapter {
  private server: Server;
  public version: string;

  constructor(hapiServer: Server) {
    this.server = hapiServer;
    this.version = hapiServer.plugins.kibana.status.plugin.version;
  }

  exposeStaticDir(urlPath: string, dir: string): void {
    this.server.route({
      method: 'GET',
      path: urlPath,
      handler: {
        directory: {
          path: dir,
        },
      },
    });
  }

  registerRoute<RouteRequest extends WrappableRequest, RouteResponse>(
    route: FrameworkRouteOptions<RouteRequest, RouteResponse>
  ) {
    const wrappedHandler = (request: any, reply: IStrictReply<RouteResponse>) =>
      route.handler(wrapRequest(request), reply);

    this.server.route({
      path: route.path,
      method: route.method,
      handler: wrappedHandler,
    });
  }

  installIndexTemplate(name: string, template: {}) {
    return this.callWithInternalUser('indices.putTemplate', {
      name,
      body: template,
    });
  }

  async callWithInternalUser(esMethod: string, options: {}) {
    const { elasticsearch } = this.server.plugins;
    const { callWithInternalUser } = elasticsearch.getCluster('admin');
    return await callWithInternalUser(esMethod, options);
  }

  async callWithRequest(req: FrameworkRequest<Request>, ...rest: any[]) {
    const internalRequest = req[internalFrameworkRequest];
    const { elasticsearch } = internalRequest.server.plugins;
    const { callWithRequest } = elasticsearch.getCluster('data');
    const fields = await callWithRequest(internalRequest, ...rest);
    return fields;
  }
}
