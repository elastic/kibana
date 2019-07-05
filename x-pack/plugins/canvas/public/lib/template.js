/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { tagsRegistry } from '../lib/tags_registry';
import { getDefaultWorkpad } from '../state/defaults';
import { getId } from './get_id';

const defaultWorkpad = getDefaultWorkpad();

export function Template(config) {
  // The name of the template
  this.name = config.name;

  // Use this to set a more friendly name
  this.displayName = config.displayName || this.name;

  this.id = config.id || getId('workpad');

  // A sentence or few about what this template contains
  this.help = config.help || '';

  // Tags for categorizing the template
  this.tags = config.tags || [];

  this.tags.forEach(tag => {
    if (!tagsRegistry.get(tag)) {
      tagsRegistry.register(() => ({ name: tag, color: '#666666' }));
    }
  });

  this.width = config.width || defaultWorkpad.width;

  this.height = config.height || defaultWorkpad.height;

  this.page = config.page || defaultWorkpad.page;

  this.pages = config.pages || defaultWorkpad.pages;

  this.colors = config.colors || defaultWorkpad.colors;

  this['@timestamp'] = config['@timestamp'] || defaultWorkpad['@timestamp'];

  this['@created'] = config['@created'] || defaultWorkpad['@created'];

  this.assets = config.assets || {};

  this.css = config.css || defaultWorkpad.css;
}
