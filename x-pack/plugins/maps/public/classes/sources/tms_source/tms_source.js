/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractSource } from '../source';

export class AbstractTMSSource extends AbstractSource {
  async getUrlTemplate() {
    throw new Error('Should implement TMSSource#getUrlTemplate');
  }

  convertMarkdownLinkToObjectArr(markdown) {
    return markdown.split('|').map((attribution) => {
      attribution = attribution.trim();
      //this assumes attribution is plain markdown link
      const extractLink = /\[(.*)\]\((.*)\)/;
      const result = extractLink.exec(attribution);
      return {
        label: result ? result[1] : null,
        url: result ? result[2] : null,
      };
    });
  }
}
