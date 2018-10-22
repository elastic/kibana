import { Fn } from '../../common/lib/fn';
import { functions as browserFns } from '../../canvas_plugin_src/functions/browser';
import { functions as commonFns } from '../../canvas_plugin_src/functions/common';
import { functions as serverFns } from '../../canvas_plugin_src/functions/server/src';

export const functionSpecs = [...browserFns, ...commonFns, ...serverFns].map(fn => new Fn(fn()));
