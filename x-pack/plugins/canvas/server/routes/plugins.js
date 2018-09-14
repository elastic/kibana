import { getPluginStream } from '../lib/get_plugin_stream';
import { pluginPaths } from '../lib/plugin_paths';

export function plugins(server) {
  server.route({
    method: 'GET',
    path: '/api/canvas/plugins',
    handler: function(request, reply) {
      const { type } = request.query;

      if (!pluginPaths[type]) return reply({ error: 'Invalid type' }).code(400);

      reply(getPluginStream(type));
    },
  });
}
