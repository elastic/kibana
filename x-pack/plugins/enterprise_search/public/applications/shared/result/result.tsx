/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiToolTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ResultFields } from './result_fields';
import { ResultHeader } from './result_header';

import { MetaDataProps, ResultFieldProps } from './types';
import './result.scss';

interface ResultProps {
  fields: ResultFieldProps[];
  metaData: MetaDataProps;
}

export const Result: React.FC<ResultProps> = ({ metaData, fields }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const tooltipText =
    fields.length <= 3
      ? i18n.translate('xpack.enterpriseSearch.shared.result.expandTooltip.allVisible', {
          defaultMessage: 'All fields are visible',
        })
      : isExpanded
      ? i18n.translate('xpack.enterpriseSearch.shared.result.expandTooltip.showFewer', {
          defaultMessage: 'Show {amount} fewer fields',
          values: { amount: fields.length - 3 },
        })
      : i18n.translate('xpack.enterpriseSearch.shared.result.expandTooltip.showMore', {
          defaultMessage: 'Show {amount} more fields',
          values: { amount: fields.length - 3 },
        });
  const toolTipContent = <>{tooltipText}</>;

  return (
    <EuiPanel hasBorder paddingSize="s">
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
            <EuiFlexItem grow={false}>
              <ResultHeader
                title={
                  metaData.title ??
                  i18n.translate('xpack.enterpriseSearch.shared.result.title.id', {
                    defaultMessage: 'Document id: {id}',
                    values: { id: metaData.id },
                  })
                }
                metaData={metaData}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <ResultFields
                isExpanded={isExpanded}
                fields={isExpanded ? fields : fields.slice(0, 3)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div className="resultExpandColumn">
            <EuiToolTip position="left" content={toolTipContent}>
              <EuiButtonIcon
                iconType={isExpanded ? 'fold' : 'unfold'}
                color="text"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-label={tooltipText}
              />
            </EuiToolTip>
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
