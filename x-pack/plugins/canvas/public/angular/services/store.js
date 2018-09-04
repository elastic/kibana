import { uiModules } from 'ui/modules';
import uniqBy from 'lodash.uniqby';
import { createStore } from '../../state/store';
import { getInitialState } from '../../state/initial_state';
import { functionsRegistry } from '../../../common/lib/functions_registry';

const app = uiModules.get('apps/canvas');
app.service('canvasStore', (kbnVersion, basePath, reportingBrowserType, serverFunctions) => {
  // this is effectively what happens to serverFunctions
  const clientFunctionsPOJO = JSON.parse(JSON.stringify(functionsRegistry.toArray()));
  const functionDefinitions = uniqBy(serverFunctions.concat(clientFunctionsPOJO), 'name');

  const initialState = getInitialState();

  // Set the defaults from Kibana plugin
  initialState.app = {
    kbnVersion,
    basePath,
    reportingBrowserType,
    functionDefinitions,
    ready: false,
  };

  const store = createStore(initialState);

  // TODO: debugging, remove this
  window.canvasStore = store;

  return store;
});
