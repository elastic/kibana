/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useCallback, useEffect } from 'react';
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

export const SimulateTemplate = ({ template, minHeightCodeBlock }: Props) => {
  const [templatePreview, setTemplatePreview] = useState('{}');

  const updatePreview = useCallback(async () => {
    const indexTemplate = serializeTemplate(stripEmptyFields(template) as TemplateDeserialized);
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
    <EuiCodeBlock style={{ minHeight: minHeightCodeBlock }} lang="json">
      {templatePreview}
    </EuiCodeBlock>
  );
};
