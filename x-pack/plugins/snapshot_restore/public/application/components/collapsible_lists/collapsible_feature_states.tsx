/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiTitle, EuiLink, EuiIcon, EuiText, EuiSpacer } from '@elastic/eui';

import { FEATURE_STATES_NONE_OPTION } from '../../../../common/constants';
import { useCollapsibleList } from './use_collapsible_list';

interface Props {
  featureStates: string[] | undefined;
}

export const CollapsibleFeatureStatesList: React.FunctionComponent<Props> = ({ featureStates }) => {
  const { isShowingFullList, setIsShowingFullList, items, hiddenItemsCount } = useCollapsibleList({
    items: featureStates,
  });

  if (items === 'all' || items.length === 0) {
    return (
      <FormattedMessage
        id="xpack.snapshotRestore.featureStatesList.allFeaturesLabel"
        defaultMessage="All features"
      />
    );
  }

  if (items.find((option) => option === FEATURE_STATES_NONE_OPTION)) {
    return (
      <FormattedMessage
        id="xpack.snapshotRestore.featureStatesList.noneFeaturesLabel"
        defaultMessage="No features"
      />
    );
  }

  return (
    <>
      <EuiText data-test-subj="featureStatesList">
        {items.map((feature) => (
          <div key={feature}>
            <EuiTitle size="xs">
              <span>{feature}</span>
            </EuiTitle>
          </div>
        ))}
      </EuiText>
      {hiddenItemsCount ? (
        <>
          <EuiSpacer size="xs" />
          <EuiLink
            onClick={() =>
              isShowingFullList ? setIsShowingFullList(false) : setIsShowingFullList(true)
            }
          >
            {isShowingFullList ? (
              <FormattedMessage
                id="xpack.snapshotRestore.featureStatesList.featureStatesCollapseAllLink"
                defaultMessage="Hide {count, plural, one {# feature} other {# features}}"
                values={{ count: hiddenItemsCount }}
              />
            ) : (
              <FormattedMessage
                id="xpack.snapshotRestore.featureStatesList.featureStatesExpandAllLink"
                defaultMessage="Show {count, plural, one {# feature} other {# features}}"
                values={{ count: hiddenItemsCount }}
              />
            )}{' '}
            <EuiIcon type={isShowingFullList ? 'arrowUp' : 'arrowDown'} />
          </EuiLink>
        </>
      ) : null}
    </>
  );
};
