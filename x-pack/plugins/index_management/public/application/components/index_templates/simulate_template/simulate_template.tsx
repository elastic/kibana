/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useCallback, useEffect } from 'react';
import uuid from 'uuid';
import { EuiCodeBlock } from '@elastic/eui';

import { serializers } from '../../../../shared_imports';
import { TemplateDeserialized } from '../../../../../common';
import { serializeTemplate } from '../../../../../common/lib/template_serialization';
import { simulateIndexTemplate } from '../../../services';

const { stripEmptyFields } = serializers;

interface Props {
  template: { [key: string]: any };
  minHeightCodeBlock?: string;
}

export const SimulateTemplate = React.memo(({ template, minHeightCodeBlock }: Props) => {
  const [templatePreview, setTemplatePreview] = useState('{}');

  const updatePreview = useCallback(async () => {
    if (!template || Object.keys(template).length === 0) {
      return;
    }

    const indexTemplate = serializeTemplate(stripEmptyFields(template) as TemplateDeserialized);

    // Until ES fixes a bug on their side we will send a random index pattern to the simulate API.
    // Issue: https://github.com/elastic/elasticsearch/issues/59152
    indexTemplate.index_patterns = [uuid.v4()];

    const { data, error } = await simulateIndexTemplate(indexTemplate);

    if (data) {
      // "Overlapping" info is only useful when simulating against an index
      // which we don't do here.
      delete data.overlapping;
    }

    setTemplatePreview(JSON.stringify(data ?? error, null, 2));
  }, [template]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  return templatePreview === '{}' ? null : (
    <EuiCodeBlock
      style={{ minHeight: minHeightCodeBlock }}
      lang="json"
      data-test-subj="simulateTemplatePreview"
    >
      {templatePreview}
    </EuiCodeBlock>
  );
});
