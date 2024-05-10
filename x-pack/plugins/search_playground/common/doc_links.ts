/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinks } from '@kbn/doc-links';

class PlaygroundDocLinks {
  public chatPlayground: string = '';

  constructor() {}

  setDocLinks(newDocLinks: DocLinks) {
    this.chatPlayground = newDocLinks.playground.chatPlayground;
  }
}

export const docLinks = new PlaygroundDocLinks();
