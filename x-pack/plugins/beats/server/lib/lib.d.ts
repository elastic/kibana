import { internalFrameworkRequest } from '../utils/wrap_request';
import {
  Request,
  IStrictReply,
  IRouteAdditionalConfigurationOptions,
} from 'hapi';

export interface CMDomainLibs {}

export interface CMServerLibs extends CMDomainLibs {
  framework: BackendFrameworkAdapter;
}

export interface BackendFrameworkAdapter {
  version: string;
  exposeStaticDir(urlPath: string, dir: string): void;
  installIndexTemplate(name: string, template: {}): void;
  registerRoute<RouteRequest extends WrappableRequest, RouteResponse>(
    route: FrameworkRouteOptions<RouteRequest, RouteResponse>
  ): void;
  callWithRequest<Hit = {}, Aggregation = undefined>(
    req: FrameworkRequest,
    method: 'search',
    options?: object
  ): Promise<DatabaseSearchResponse<Hit, Aggregation>>;
  callWithRequest(
    req: FrameworkRequest,
    method: 'fieldCaps',
    options?: object
  ): Promise<DatabaseFieldCapsResponse>;
  callWithRequest(
    req: FrameworkRequest,
    method: string,
    options?: object
  ): Promise<DatabaseSearchResponse>;
}

interface DatabaseFieldCapsResponse extends DatabaseResponse {
  fields: FieldsResponse;
}

export interface FieldsResponse {
  [name: string]: FieldDef;
}

export interface FieldDetails {
  searchable: boolean;
  aggregatable: boolean;
  type: string;
}

export interface FieldDef {
  [type: string]: FieldDetails;
}

export interface FrameworkRequest<
  InternalRequest extends WrappableRequest = WrappableRequest
> {
  [internalFrameworkRequest]: InternalRequest;
  payload: InternalRequest['payload'];
  params: InternalRequest['params'];
  query: InternalRequest['query'];
}

export interface FrameworkRouteOptions<
  RouteRequest extends WrappableRequest,
  RouteResponse
> {
  path: string;
  method: string | string[];
  vhost?: string;
  handler: FrameworkRouteHandler<RouteRequest, RouteResponse>;
  config?: Pick<
    IRouteAdditionalConfigurationOptions,
    Exclude<keyof IRouteAdditionalConfigurationOptions, 'handler'>
  >;
}

export interface FrameworkRouteHandler<
  RouteRequest extends WrappableRequest,
  RouteResponse
> {
  (
    request: FrameworkRequest<RouteRequest>,
    reply: IStrictReply<RouteResponse>
  ): void;
}

export interface WrappableRequest<Payload = any, Params = any, Query = any> {
  payload: Payload;
  params: Params;
  query: Query;
}

interface DatabaseResponse {
  took: number;
  timeout: boolean;
}

interface DatabaseSearchResponse<Hit = {}, Aggregations = undefined>
  extends DatabaseResponse {
  aggregations?: Aggregations;
  hits: {
    total: number;
    hits: Hit[];
  };
}
