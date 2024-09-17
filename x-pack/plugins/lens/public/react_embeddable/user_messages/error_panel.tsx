/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { UserMessage } from '../../types';

export function VisualizationErrorPanel({
  errors,
  canEdit,
}: {
  errors: UserMessage[];
  canEdit: boolean;
}) {
  if (!errors.length) {
    return null;
  }
  const showMore = errors.length > 1;
  const canFixInLens = canEdit && errors.some(({ fixableInEditor }) => fixableInEditor);
  return (
    <div className="lnsEmbeddedError">
      <EuiEmptyPrompt
        iconType="warning"
        iconColor="danger"
        data-test-subj="embeddable-lens-failure"
        body={
          <>
            {errors.length ? (
              <>
                <p>{errors[0].longMessage}</p>
                {showMore && !canFixInLens ? (
                  <p>
                    <FormattedMessage
                      id="xpack.lens.moreErrors"
                      defaultMessage="Edit in Lens editor to see more errors"
                    />
                  </p>
                ) : null}
                {canFixInLens ? (
                  <p>
                    <FormattedMessage
                      id="xpack.lens.fixErrors"
                      defaultMessage="Edit in Lens editor to fix the error"
                    />
                  </p>
                ) : null}
              </>
            ) : (
              <p>
                <FormattedMessage
                  id="xpack.lens.failure"
                  defaultMessage="Visualization couldn't be displayed"
                />
              </p>
            )}
          </>
        }
      />
    </div>
  );
}
