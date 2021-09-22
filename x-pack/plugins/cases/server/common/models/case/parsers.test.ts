/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineReferenceExtractor } from './parsers';

describe('timeline reference extractor', () => {
  it('extracts the references', () => {
    const extractor = new TimelineReferenceExtractor();

    extractor.extractReferences(
      `[pablo's blah](https://kibana.siem.estc.dev/app/security/timelines?timeline=(id:%274cb08020-0ccc-11ec-bd70-9121d856f27c%27,isOpen:!t))`
    );

    // extractor.extractReferences('a');
  });
});
