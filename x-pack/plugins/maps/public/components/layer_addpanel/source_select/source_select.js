/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { ALL_SOURCES } from '../../../shared/layers/sources/all_sources';
import {
  EuiTitle,
  EuiSpacer,
  EuiCard,
  EuiIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import _ from 'lodash';

export function SourceSelect({
  updateSourceSelection
}) {

  const sourceCards = ALL_SOURCES.map(Source => {
    const icon = Source.icon
      ? <EuiIcon type={Source.icon} size="l" />
      : null;
    const cardStyle =
      `${Source.indexReadyFile ? 'mapLayerImportpanel__card' : ''} mapLayerAddpanel__card`;

    return (
      <Fragment key={Source.type}>
        <EuiSpacer size="s" />
        <EuiCard
          className={cardStyle}
          title={Source.title}
          icon={icon}
          onClick={() => updateSourceSelection(Source)}
          description={Source.description}
          layout="horizontal"
          data-test-subj={_.camelCase(Source.title)}
        />
      </Fragment>
    );
  });

  return (
    <Fragment>
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="xpack.maps.addLayerPanel.chooseDataSourceTitle"
            defaultMessage="Choose data source"
          />
        </h2>
      </EuiTitle>
      {sourceCards}
    </Fragment>
  );
}
