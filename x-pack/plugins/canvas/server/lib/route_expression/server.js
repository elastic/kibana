import { populateServerRegistries } from '../populate_server_registries';
import { interpretProvider } from '../../../common/interpreter/interpret';

const pluginsReady = populateServerRegistries(['serverFunctions', 'types']);

export const server = ({ routeExpression }) => {
  return pluginsReady.then(({ serverFunctions, types }) => {
    return {
      interpret: async (ast, context) => {
        const interpret = interpretProvider({
          types: types.toJS(),
          functions: serverFunctions.toJS(),
          handlers: { environment: 'server' }, // TODO: Real handlers
          onFunctionNotFound: (ast, context) => {
            return routeExpression(ast, context);
          },
        });

        return interpret(ast, context);
      },
      getFunctions: () => Object.keys(serverFunctions.toJS()),
    };
  });
};
