import { commonFunctions } from '../../common/functions';
import { clientFunctions } from '../functions';
import { functionsRegistry } from './functions_registry';

/*
  Functions loaded here use PRIVATE APIs
  That is, they probably import a canvas singleton, eg a registry and 
  thus must be part of the main Canvas bundle. There should be *very*
  few of these things as we can't thread them. 
*/

function addFunction(fnDef) {
  functionsRegistry.register(fnDef);
}

export const loadPrivateBrowserFunctions = () => {
  clientFunctions.forEach(addFunction);
  commonFunctions.forEach(addFunction);
};
