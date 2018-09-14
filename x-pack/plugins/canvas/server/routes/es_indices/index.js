import { partial } from 'lodash';
import { getESIndices } from './get_es_indices';

// TODO: Error handling, note: esErrors
// TODO: Allow filtering by pattern name
export function esIndices(server) {
  const kbnIndex = server.config().get('kibana.index');
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');

  server.route({
    method: 'GET',
    path: '/api/canvas/es_indices',
    handler: function(request, reply) {
      reply(getESIndices(kbnIndex, partial(callWithRequest, request)));
    },
  });
}
