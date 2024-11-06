/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import { ALERT_GROUP } from '@kbn/rule-data-utils';
import { render } from '../../../utils/test_helper';
import { alertWithGroupsAndTags } from '../mock/alert';
import { useKibana } from '../../../utils/kibana_react';
import { kibanaStartMock } from '../../../utils/kibana_react.mock';
import { Group } from '../../../../common/typings';
import { SourceBar } from './source_bar';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
}));

jest.mock('../../../utils/kibana_react');

const useKibanaMock = useKibana as jest.Mock;
const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...kibanaStartMock.startContract().services,
      http: {
        basePath: {
          prepend: jest.fn(),
        },
      },
    },
  });
};

describe('Source bar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
  });

  it('should show alert data', async () => {
    const sourceBar = render(<SourceBar alert={alertWithGroupsAndTags} />);

    const groups = alertWithGroupsAndTags.fields[ALERT_GROUP] as Group[];

    expect(sourceBar.queryByText('Source')).toBeInTheDocument();
    expect(sourceBar.queryByText(groups[0].field, { exact: false })).toBeInTheDocument();
    expect(sourceBar.queryByText(groups[0].value)).toBeInTheDocument();
    expect(sourceBar.queryByText(groups[1].field, { exact: false })).toBeInTheDocument();
    expect(sourceBar.queryByText(groups[1].value)).toBeInTheDocument();
  });

  it('Should show passed sources', async () => {
    const sources = [
      { label: 'MyLabel', value: 'MyValue' },
      { label: 'SLO', value: <EuiLink data-test-subj="SourceSloLink" href="href" /> },
    ];
    const sourceBar = render(<SourceBar alert={alertWithGroupsAndTags} sources={sources} />);

    expect(sourceBar.queryByText('Source')).toBeInTheDocument();
    expect(sourceBar.queryByText(sources[0].label, { exact: false })).toBeInTheDocument();
    expect(sourceBar.queryByText(sources[0].value as string, { exact: false })).toBeInTheDocument();
    expect(sourceBar.queryByText(sources[1].label, { exact: false })).toBeInTheDocument();
    expect(sourceBar.queryByTestId('SourceSloLink')).toBeInTheDocument();
  });
});
