/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
} from '../../../../src/core/public';
import { MailNavButton } from './components/spaces_header_nav_button';

export type Setup = void;
export type Start = void;

export class NewsfeedPublicPlugin implements Plugin<Setup, Start> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): Setup {}

  public start(core: CoreStart): Start {
    function mount(targetDomElement: HTMLElement) {
      ReactDOM.render(<MailNavButton />, targetDomElement);
      return () => ReactDOM.unmountComponentAtNode(targetDomElement);
    }

    core.chrome.navControls.registerRight({
      order: 1000,
      mount,
    });
  }
}
