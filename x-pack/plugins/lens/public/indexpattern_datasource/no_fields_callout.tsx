/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const defaultNoFieldsMessageCopy = i18n.translate('xpack.lens.indexPatterns.noDataLabel', {
  defaultMessage: 'There are no fields.',
});

export const NoFieldsCallout = ({
  existFieldsInIndex,
  defaultNoFieldsMessage = defaultNoFieldsMessageCopy,
  isAffectedByFieldFilter = false,
  isAffectedByTimerange = false,
  isAffectedByGlobalFilter = false,
}: {
  existFieldsInIndex: boolean;
  isAffectedByFieldFilter?: boolean;
  defaultNoFieldsMessage?: string;
  isAffectedByTimerange?: boolean;
  isAffectedByGlobalFilter?: boolean;
}) => {
  if (!existFieldsInIndex) {
    return (
      <EuiCallOut
        size="s"
        color="warning"
        title={i18n.translate('xpack.lens.indexPatterns.noFieldsLabel', {
          defaultMessage: 'No fields exist in this data view.',
        })}
      />
    );
  }

  return (
    <EuiCallOut
      size="s"
      color="warning"
      title={
        isAffectedByFieldFilter
          ? i18n.translate('xpack.lens.indexPatterns.noFilteredFieldsLabel', {
              defaultMessage: 'No fields match the selected filters.',
            })
          : defaultNoFieldsMessage
      }
    >
      {(isAffectedByTimerange || isAffectedByFieldFilter || isAffectedByGlobalFilter) && (
        <>
          <strong>
            {i18n.translate('xpack.lens.indexPatterns.noFields.tryText', {
              defaultMessage: 'Try:',
            })}
          </strong>
          <ul>
            {isAffectedByTimerange && (
              <li>
                {i18n.translate('xpack.lens.indexPatterns.noFields.extendTimeBullet', {
                  defaultMessage: 'Extending the time range',
                })}
              </li>
            )}
            {isAffectedByFieldFilter && (
              <li>
                {i18n.translate('xpack.lens.indexPatterns.noFields.fieldTypeFilterBullet', {
                  defaultMessage: 'Using different field filters',
                })}
              </li>
            )}
            {isAffectedByGlobalFilter && (
              <li>
                {i18n.translate('xpack.lens.indexPatterns.noFields.globalFiltersBullet', {
                  defaultMessage: 'Changing the global filters',
                })}
              </li>
            )}
          </ul>
        </>
      )}
    </EuiCallOut>
  );
};
