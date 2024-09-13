/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import Fields from './case_fields';
import * as i18n from './translations';
import { swimlaneConnector as connector } from '../mock';
import { MockFormWrapperComponent } from '../test_utils';
import { SwimlaneConnectorType } from '../../../../common/types/domain';

const fields = {
  caseId: '123',
};

describe('Swimlane Cases Fields', () => {
  it('does not shows the mapping error callout', () => {
    render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={connector} />
      </MockFormWrapperComponent>
    );
    expect(screen.queryByText(i18n.EMPTY_MAPPING_WARNING_TITLE)).toBeFalsy();
  });

  it('shows the mapping error callout when mapping is invalid', () => {
    const invalidConnector = {
      ...connector,
      config: {
        ...connector.config,
        mappings: {},
      },
    };

    render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={invalidConnector} />
      </MockFormWrapperComponent>
    );
    expect(screen.queryByText(i18n.EMPTY_MAPPING_WARNING_TITLE)).toBeTruthy();
  });

  it('shows the mapping error callout when the connector is of type alerts', () => {
    const invalidConnector = {
      ...connector,
      config: {
        ...connector.config,
        connectorType: SwimlaneConnectorType.Alerts,
      },
    };

    render(
      <MockFormWrapperComponent fields={fields}>
        <Fields connector={invalidConnector} />
      </MockFormWrapperComponent>
    );
    expect(screen.queryByText(i18n.EMPTY_MAPPING_WARNING_TITLE)).toBeTruthy();
  });
});
