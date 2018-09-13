import * as home from './home';
import * as workpad from './workpad';
import * as exp from './export';

export const routes = [].concat(workpad.routes, home.routes, exp.routes);

export const apps = [workpad.WorkpadApp, home.HomeApp, exp.ExportApp];
