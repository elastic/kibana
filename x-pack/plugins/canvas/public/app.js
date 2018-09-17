/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ui/autoload/all';
import chrome from 'ui/chrome';
import './angular/config';
import './angular/services';
import { CanvasRootController } from './angular/controllers';

// Import the uiExports that the application uses
import 'uiExports/visTypes';
import 'uiExports/visResponseHandlers';
import 'uiExports/visRequestHandlers';
import 'uiExports/visEditorTypes';
import 'uiExports/savedObjectTypes';
import 'uiExports/spyModes';
import 'uiExports/fieldFormats';

// Import other parts that certain functions need
import 'ui/courier/search_strategy/default_search_strategy'; // used by visualize function

// load the application
chrome.setRootController('canvas', CanvasRootController);
