/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import Embeddable from './embeddable';
import { LensPublicStart } from '../../../../../../lens/public';
import { DataViewState } from '../hooks/use_app_data_view';
import { render } from '../rtl_helpers';
import { AddToCaseAction } from '../header/add_to_case_action';
import { ActionTypes } from './use_actions';

jest.mock('../header/add_to_case_action', () => ({
  AddToCaseAction: jest.fn(() => <div>mockAddToCaseAction</div>),
}));

const mockLensAttrs = {
  title: '[Host] KPI Hosts - metric 1',
  description: '',
  visualizationType: 'lnsMetric',
  state: {
    visualization: {
      accessor: 'b00c65ea-32be-4163-bfc8-f795b1ef9d06',
      layerId: '416b6fad-1923-4f6a-a2df-b223bb287e30',
      layerType: 'data',
    },
    query: {
      language: 'kuery',
      query: '',
    },
    filters: [],
    datasourceStates: {
      indexpattern: {
        layers: {
          '416b6fad-1923-4f6a-a2df-b223bb287e30': {
            columnOrder: ['b00c65ea-32be-4163-bfc8-f795b1ef9d06'],
            columns: {
              'b00c65ea-32be-4163-bfc8-f795b1ef9d06': {
                customLabel: true,
                dataType: 'number',
                isBucketed: false,
                label: ' ',
                operationType: 'unique_count',
                scale: 'ratio',
                sourceField: 'host.name',
              },
            },
            incompleteColumns: {},
          },
        },
      },
    },
  },
  references: [
    {
      type: 'index-pattern',
      id: 'security-solution-default',
      name: 'indexpattern-datasource-current-indexpattern',
    },
    {
      type: 'index-pattern',
      id: 'security-solution-default',
      name: 'indexpattern-datasource-layer-416b6fad-1923-4f6a-a2df-b223bb287e30',
    },
    {
      type: 'tag',
      id: 'security-solution-default',
      name: 'tag-ref-security-solution-default',
    },
  ],
};
const mockTimeRange = {
  from: '2022-02-15T16:00:00.000Z',
  to: '2022-02-16T15:59:59.999Z',
};
const mockOwner = 'securitySolution';
const mockAppId = 'securitySolutionUI';
const mockDataViews = {} as DataViewState;
const mockReportType = 'kpi-over-time';
const mockTitle = 'mockTitle';
const mockLens = {
  EmbeddableComponent: jest.fn((props) => {
    return (
      <div
        data-test-subj={
          props.id === 'exploratoryView-singleMetric'
            ? 'exploratoryView-singleMetric'
            : 'exploratoryView'
        }
      >
        mockEmbeddableComponent
      </div>
    );
  }),
  SaveModalComponent: jest.fn(() => <div>mockSaveModalComponent</div>),
} as unknown as LensPublicStart;
const mockActions: ActionTypes[] = ['addToCase', 'openInLens'];

describe('Embeddable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title', async () => {
    const { container, getByText } = render(
      <Embeddable
        appId={mockAppId}
        caseOwner={mockOwner}
        customLensAttrs={mockLensAttrs}
        customTimeRange={mockTimeRange}
        indexPatterns={mockDataViews}
        lens={mockLens}
        reportType={mockReportType}
        title={mockTitle}
        withActions={mockActions}
      />
    );
    expect(container.querySelector(`[data-test-subj="exploratoryView-title"]`)).toBeInTheDocument();
    expect(getByText(mockTitle)).toBeInTheDocument();
  });

  it('renders no title if it is not given', async () => {
    const { container } = render(
      <Embeddable
        appId={mockAppId}
        caseOwner={mockOwner}
        customLensAttrs={mockLensAttrs}
        customTimeRange={mockTimeRange}
        indexPatterns={mockDataViews}
        lens={mockLens}
        reportType={mockReportType}
        withActions={mockActions}
      />
    );
    expect(
      container.querySelector(`[data-test-subj="exploratoryView-title"]`)
    ).not.toBeInTheDocument();
  });

  it('renders lens component', () => {
    const { container } = render(
      <Embeddable
        appId={mockAppId}
        caseOwner={mockOwner}
        customLensAttrs={mockLensAttrs}
        customTimeRange={mockTimeRange}
        indexPatterns={mockDataViews}
        lens={mockLens}
        reportType={mockReportType}
        withActions={mockActions}
      />
    );

    expect(
      container.querySelector(`[data-test-subj="exploratoryView-singleMetric"]`)
    ).not.toBeInTheDocument();
    expect(container.querySelector(`[data-test-subj="exploratoryView"]`)).toBeInTheDocument();
    expect((mockLens.EmbeddableComponent as jest.Mock).mock.calls[0][0].id).toEqual(
      'exploratoryView'
    );
    expect((mockLens.EmbeddableComponent as jest.Mock).mock.calls[0][0].attributes).toEqual(
      mockLensAttrs
    );
    expect((mockLens.EmbeddableComponent as jest.Mock).mock.calls[0][0].timeRange).toEqual(
      mockTimeRange
    );
    expect((mockLens.EmbeddableComponent as jest.Mock).mock.calls[0][0].timeRange).toEqual(
      mockTimeRange
    );
    expect((mockLens.EmbeddableComponent as jest.Mock).mock.calls[0][0].withDefaultActions).toEqual(
      true
    );
  });

  it('renders single metric', () => {
    const { container } = render(
      <Embeddable
        appId={mockAppId}
        caseOwner={mockOwner}
        customLensAttrs={mockLensAttrs}
        customTimeRange={mockTimeRange}
        indexPatterns={mockDataViews}
        isSingleMetric={true}
        lens={mockLens}
        reportType={mockReportType}
        withActions={mockActions}
      />
    );
    expect(
      container.querySelector(`[data-test-subj="exploratoryView-singleMetric"]`)
    ).toBeInTheDocument();
    expect(container.querySelector(`[data-test-subj="exploratoryView"]`)).not.toBeInTheDocument();
    expect((mockLens.EmbeddableComponent as jest.Mock).mock.calls[0][0].id).toEqual(
      'exploratoryView-singleMetric'
    );
    expect((mockLens.EmbeddableComponent as jest.Mock).mock.calls[0][0].attributes).toEqual(
      mockLensAttrs
    );
    expect((mockLens.EmbeddableComponent as jest.Mock).mock.calls[0][0].timeRange).toEqual(
      mockTimeRange
    );
    expect((mockLens.EmbeddableComponent as jest.Mock).mock.calls[0][0].withDefaultActions).toEqual(
      true
    );
  });

  it('renders AddToCaseAction', () => {
    render(
      <Embeddable
        appId={mockAppId}
        caseOwner={mockOwner}
        customLensAttrs={mockLensAttrs}
        customTimeRange={mockTimeRange}
        indexPatterns={mockDataViews}
        isSingleMetric={true}
        lens={mockLens}
        reportType={mockReportType}
        withActions={mockActions}
      />
    );

    expect((AddToCaseAction as jest.Mock).mock.calls[0][0].timeRange).toEqual(mockTimeRange);
    expect((AddToCaseAction as jest.Mock).mock.calls[0][0].appId).toEqual(mockAppId);
    expect((AddToCaseAction as jest.Mock).mock.calls[0][0].lensAttributes).toEqual(mockLensAttrs);
    expect((AddToCaseAction as jest.Mock).mock.calls[0][0].owner).toEqual(mockOwner);
  });
});
