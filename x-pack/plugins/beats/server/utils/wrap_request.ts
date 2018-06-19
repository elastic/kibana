import { FrameworkRequest, WrappableRequest } from '../lib/lib';

export const internalFrameworkRequest = Symbol('internalFrameworkRequest');

export function wrapRequest<InternalRequest extends WrappableRequest>(
  req: InternalRequest
): FrameworkRequest<InternalRequest> {
  const { params, payload, query } = req;

  return {
    [internalFrameworkRequest]: req,
    params,
    payload,
    query,
  };
}
