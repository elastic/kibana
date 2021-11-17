/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { IndexPattern } from '../../../../../../../src/plugins/data/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { SecuritySolutionTemplate } from '../../../../common/types/matrix_histogram_templates';
import { useFindTemplates } from '../../hooks/use_find_matrix_histogram_templates';

export const MatrixHistogramTemplates = ({ plugins }) => {
  const findTemplates = useFindTemplates();
  const [templates, setTemplates] = useState<SecuritySolutionTemplate[]>([]);
  const [time, setTime] = useState({
    from: 'now-5d',
    to: 'now',
    mode: 'relative',
  });

  const [defaultIndexPattern, setDefaultIndexPattern] = useState<IndexPattern | null>(null);
  const {
    services: { lens },
  } = useKibana();

  const LensComponent = lens.EmbeddableComponent;

  useEffect(() => {
    const mount = async () => {
      const response = await findTemplates();
      const templatesWithIndexPattern =
        response.templates.length > 0
          ? response.templates.map((template) => {
              console.log(template.attributes.references);

              return {
                ...template,
                attributes: {
                  ...template.attributes,
                  references: template.attributes.references.map((ref) => ({
                    ...ref,
                    id: defaultIndexPattern.id ?? null,
                  })),
                },
              };
            })
          : [];
      console.log(templatesWithIndexPattern, defaultIndexPattern);
      setTemplates(templatesWithIndexPattern || []);
    };
    mount();
  }, [defaultIndexPattern, findTemplates]);

  useEffect(() => {
    const fetchIndexPattern = async () => {
      const fetchedDefaultIndexPattern = await plugins.data.indexPatterns.getDefault();

      setDefaultIndexPattern(fetchedDefaultIndexPattern);
    };
    fetchIndexPattern();
  }, [plugins.data.indexPatterns]);

  // const onCreateWorkpad = useCreateFromTemplate();

  return templates && defaultIndexPattern?.isTimeBased()
    ? templates.map((t) => (
        <LensComponent
          id={t.id}
          key={t.id}
          withActions
          style={{ height: 280 }}
          timeRange={time}
          attributes={t.attributes}
          // onLoad={(val) => {
          //   setIsLoading(val);
          // }}
          onBrushEnd={({ range }) => {
            setTime({
              from: new Date(range[0]).toISOString(),
              to: new Date(range[1]).toISOString(),
            });
          }}
          onFilter={(_data) => {
            // call back event for on filter event
          }}
          onTableRowClick={(_data) => {
            // call back event for on table row click event
          }}
        />
      ))
    : 'Embeddable place holder';
};
