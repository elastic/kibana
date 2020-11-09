/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useCallback, useEffect } from 'react';
import uuid from 'uuid';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCodeBlock, EuiCallOut } from '@elastic/eui';

import { serializers } from '../../../../shared_imports';
import { TemplateDeserialized } from '../../../../../common';
import { serializeTemplate } from '../../../../../common/lib/template_serialization';
import { simulateIndexTemplate } from '../../../services';

const { stripEmptyFields } = serializers;

export interface Filters {
  mappings: boolean;
  settings: boolean;
  aliases: boolean;
}

interface Props {
  template: { [key: string]: any };
  filters?: Filters;
}

export const SimulateTemplate = React.memo(({ template, filters }: Props) => {
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
    let filteredTemplate = data;

    if (data) {
      // "Overlapping" info is only useful when simulating against an index
      // which we don't do here.
      delete data.overlapping;

      if (data.template && data.template.mappings === undefined) {
        // Adding some extra logic to return an empty object for "mappings" as ES does not
        // return one in that case (empty objects _are_ returned for "settings" and "aliases")
        // Issue: https://github.com/elastic/elasticsearch/issues/60968
        data.template.mappings = {};
      }

      if (filters) {
        filteredTemplate = Object.entries(filters).reduce(
          (acc, [key, value]) => {
            if (!value) {
              delete acc[key];
            }
            return acc;
          },
          { ...data.template } as any
        );
      }
    }

    setTemplatePreview(JSON.stringify(filteredTemplate ?? error, null, 2));
  }, [template, filters]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  const isEmpty = templatePreview === '{}';
  const hasFilters = Boolean(filters);

  if (isEmpty && hasFilters) {
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.idxMgmt.simulateTemplate.noFilterSelected"
            defaultMessage="Select at least one option to preview."
          />
        }
        iconType="pin"
        size="s"
      />
    );
  }

  return isEmpty ? null : (
    <EuiCodeBlock lang="json" data-test-subj="simulateTemplatePreview">
      {templatePreview}
    </EuiCodeBlock>
  );
});
