/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { SwimlaneConnectorType } from '../../../../common/api';
import Fields from './case_fields';
import * as i18n from './translations';
import { swimlaneConnector as connector } from '../mock';

const fields = {
  caseId: '123',
};

const onChange = jest.fn();

describe('Swimlane Cases Fields', () => {
  test('it does not shows the mapping error callout', () => {
    render(<Fields connector={connector} fields={fields} onChange={onChange} />);
    expect(screen.queryByText(i18n.EMPTY_MAPPING_WARNING_TITLE)).toBeFalsy();
  });

  test('it shows the mapping error callout when mapping is invalid', () => {
    const invalidConnector = {
      ...connector,
      config: {
        ...connector.config,
        mappings: {},
      },
    };

    render(<Fields connector={invalidConnector} fields={fields} onChange={onChange} />);
    expect(screen.queryByText(i18n.EMPTY_MAPPING_WARNING_TITLE)).toBeTruthy();
  });

  test('it shows the mapping error callout when the connector is of type alerts', () => {
    const invalidConnector = {
      ...connector,
      config: {
        ...connector.config,
        connectorType: SwimlaneConnectorType.Alerts,
      },
    };

    render(<Fields connector={invalidConnector} fields={fields} onChange={onChange} />);
    expect(screen.queryByText(i18n.EMPTY_MAPPING_WARNING_TITLE)).toBeTruthy();
  });
});
