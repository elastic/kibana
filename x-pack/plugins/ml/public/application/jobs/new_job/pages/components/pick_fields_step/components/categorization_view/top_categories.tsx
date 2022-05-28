/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useEffect, useState } from 'react';
import { EuiBasicTable, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { JobCreatorContext } from '../../../job_creator_context';
import { CategorizationJobCreator } from '../../../../../common/job_creator';
import { Results } from '../../../../../common/results_loader';
import { ml } from '../../../../../../../services/ml_api_service';
import { NUMBER_OF_CATEGORY_EXAMPLES } from '../../../../../../../../../common/constants/categorization_job';

export const TopCategories: FC = () => {
  const { jobCreator: jc, resultsLoader } = useContext(JobCreatorContext);
  const jobCreator = jc as CategorizationJobCreator;

  const [tableRow, setTableRow] = useState<Array<{ count?: number; example: string }>>([]);
  const [totalCategories, setTotalCategories] = useState(0);

  function setResultsWrapper(results: Results) {
    loadTopCats();
  }

  async function loadTopCats() {
    const results = await ml.jobs.topCategories(jobCreator.jobId, NUMBER_OF_CATEGORY_EXAMPLES);
    setTableRow(
      results.categories.map((c) => ({
        count: c.count,
        example: c.category.examples?.length ? c.category.examples[0] : '',
      }))
    );
    setTotalCategories(results.total);
  }

  useEffect(() => {
    // subscribe to result updates
    const resultsSubscription = resultsLoader.subscribeToResults(setResultsWrapper);
    return () => {
      resultsSubscription.unsubscribe();
    };
  }, []);

  const columns = [
    // only include counts if model plot is enabled
    ...(jobCreator.modelPlot
      ? [
          {
            field: 'count',
            name: 'count',
            width: '100px',
            render: (count: any) => (
              <EuiText size="s">
                <code>{count}</code>
              </EuiText>
            ),
          },
        ]
      : []),
    {
      field: 'example',
      name: 'Example',
      render: (example: any) => (
        <EuiText size="s">
          <code>{example}</code>
        </EuiText>
      ),
    },
  ];

  return (
    <>
      {totalCategories > 0 && (
        <>
          <div>
            <FormattedMessage
              id="xpack.ml.newJob.wizard.pickFieldsStep.categorizationTotalCategories"
              defaultMessage="Total categories: {totalCategories}"
              values={{ totalCategories }}
            />
          </div>
          <EuiBasicTable columns={columns} items={tableRow} />
        </>
      )}
    </>
  );
};
