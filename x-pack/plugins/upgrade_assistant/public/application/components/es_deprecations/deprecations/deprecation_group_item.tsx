/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FunctionComponent } from 'react';
import { EuiAccordion, EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { EnrichedDeprecationInfo } from '../../../../../common/types';
import { DeprecationHealth } from '../../shared';
import { GroupByOption } from '../../types';
import { EsDeprecationList } from './list';
import { LEVEL_MAP } from '../../constants';

export interface Props {
  id: string;
  deprecations: EnrichedDeprecationInfo[];
  title: string;
  currentGroupBy: GroupByOption;
  forceExpand: boolean;
  dataTestSubj: string;
}

/**
 * A single accordion item for a grouped deprecation item.
 */
export const EsDeprecationAccordion: FunctionComponent<Props> = ({
  id,
  deprecations,
  title,
  currentGroupBy,
  forceExpand,
  dataTestSubj,
}) => {
  const hasIndices = Boolean(
    currentGroupBy === GroupByOption.message &&
      (deprecations as EnrichedDeprecationInfo[]).filter((d) => d.index).length
  );
  const numIndices = hasIndices ? deprecations.length : null;

  return (
    <EuiAccordion
      id={id}
      key={id}
      data-test-subj={dataTestSubj}
      initialIsOpen={forceExpand}
      buttonContent={title}
      extraAction={
        <div>
          {hasIndices && (
            <>
              <EuiBadge color="hollow">
                <span data-test-subj="indexCount">{numIndices}</span>{' '}
                <FormattedMessage
                  id="xpack.upgradeAssistant.checkupTab.indicesBadgeLabel"
                  defaultMessage="{numIndices, plural, one {index} other {indices}}"
                  values={{ numIndices }}
                />
              </EuiBadge>
              &emsp;
            </>
          )}
          <DeprecationHealth
            single={currentGroupBy === GroupByOption.message}
            deprecationLevels={deprecations.map((d) => LEVEL_MAP[d.level])}
          />
        </div>
      }
    >
      <EsDeprecationList deprecations={deprecations} currentGroupBy={currentGroupBy} />
    </EuiAccordion>
  );
};
