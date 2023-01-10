/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '../../../common/mock';
import '../../../common/mock/match_media';
import { getEmptyValue } from '../../../common/components/empty_value';

import {
  autonomousSystemRenderer,
  dateRenderer,
  hostNameRenderer,
  locationRenderer,
  whoisRenderer,
  reputationRenderer,
  DefaultFieldRenderer,
  DEFAULT_MORE_MAX_HEIGHT,
  DefaultFieldRendererOverflow,
  MoreContainer,
} from './field_renderers';
import { mockData } from '../../../explore/network/components/details/mock';
import type { AutonomousSystem } from '../../../../common/search_strategy';
import { FlowTarget } from '../../../../common/search_strategy';
import type { HostEcs } from '@kbn/securitysolution-ecs';

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/lib/kibana/kibana_react', () => {
  return {
    useKibana: () => ({
      services: {
        application: {
          getUrlForApp: (appId: string, options?: { path?: string; deepLinkId?: boolean }) =>
            `${appId}/${options?.deepLinkId ?? ''}${options?.path ?? ''}`,
        },
      },
    }),
  };
});

describe('Field Renderers', () => {
  describe('#locationRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const { asFragment } = render(
        locationRenderer(['source.geo.city_name', 'source.geo.region_name'], mockData.complete)
      );

      expect(asFragment()).toMatchSnapshot();
    });

    test('it renders emptyTagValue when no fields provided', () => {
      render(<TestProviders>{locationRenderer([], mockData.complete)}</TestProviders>);
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });

    test('it renders emptyTagValue when invalid fields provided', () => {
      render(
        <TestProviders>
          {locationRenderer(['source.geo.my_house'], mockData.complete)}
        </TestProviders>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });
  });

  describe('#dateRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const { asFragment } = render(dateRenderer(mockData.complete.source?.firstSeen));

      expect(asFragment()).toMatchSnapshot();
    });

    test('it renders emptyTagValue when invalid field provided', () => {
      render(<TestProviders>{dateRenderer(null)}</TestProviders>);
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });
  });

  describe('#autonomousSystemRenderer', () => {
    const emptyMock: AutonomousSystem = { organization: { name: null }, number: null };
    const halfEmptyMock: AutonomousSystem = { organization: { name: 'Test Org' }, number: null };

    test('it renders correctly against snapshot', () => {
      const { asFragment } = render(
        autonomousSystemRenderer(mockData.complete.source!.autonomousSystem!, FlowTarget.source)
      );

      expect(asFragment()).toMatchSnapshot();
    });

    test('it renders emptyTagValue when non-string field provided', () => {
      render(
        <TestProviders>{autonomousSystemRenderer(halfEmptyMock, FlowTarget.source)}</TestProviders>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });

    test('it renders emptyTagValue when invalid field provided', () => {
      render(
        <TestProviders>{autonomousSystemRenderer(emptyMock, FlowTarget.source)}</TestProviders>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });
  });

  describe('#hostIdRenderer', () => {
    const emptyIdHost: Partial<HostEcs> = {
      name: ['test'],
      id: undefined,
      ip: ['10.10.10.10'],
    };
    const emptyIpHost: Partial<HostEcs> = {
      name: ['test'],
      id: ['test'],
      ip: undefined,
    };
    test('it renders correctly against snapshot', () => {
      const { asFragment } = render(
        <TestProviders>{hostNameRenderer(mockData.complete.host, '10.10.10.10')}</TestProviders>
      );
      expect(asFragment()).toMatchSnapshot();
    });

    test('it renders emptyTagValue when non-matching IP is provided', () => {
      render(
        <TestProviders>{hostNameRenderer(mockData.complete.host, '10.10.10.11')}</TestProviders>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });

    test('it renders emptyTagValue when no host.id is provided', () => {
      render(<TestProviders>{hostNameRenderer(emptyIdHost, FlowTarget.source)}</TestProviders>);
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });
    test('it renders emptyTagValue when no host.ip is provided', () => {
      render(<TestProviders>{hostNameRenderer(emptyIpHost, FlowTarget.source)}</TestProviders>);
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });
  });

  describe('#hostNameRenderer', () => {
    const emptyIdHost: Partial<HostEcs> = {
      name: ['test'],
      id: undefined,
      ip: ['10.10.10.10'],
    };
    const emptyIpHost: Partial<HostEcs> = {
      name: ['test'],
      id: ['test'],
      ip: undefined,
    };
    const emptyNameHost: Partial<HostEcs> = {
      name: undefined,
      id: ['test'],
      ip: ['10.10.10.10'],
    };
    test('it renders correctly against snapshot', () => {
      const { asFragment } = render(
        <TestProviders>{hostNameRenderer(mockData.complete.host, '10.10.10.10')}</TestProviders>
      );

      expect(asFragment()).toMatchSnapshot();
    });

    test('it renders emptyTagValue when non-matching IP is provided', () => {
      render(
        <TestProviders>{hostNameRenderer(mockData.complete.host, '10.10.10.11')}</TestProviders>
      );
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });

    test('it renders emptyTagValue when no host.id is provided', () => {
      render(<TestProviders>{hostNameRenderer(emptyIdHost, FlowTarget.source)}</TestProviders>);
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });
    test('it renders emptyTagValue when no host.ip is provided', () => {
      render(<TestProviders>{hostNameRenderer(emptyIpHost, FlowTarget.source)}</TestProviders>);
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });
    test('it renders emptyTagValue when no host.name is provided', () => {
      render(<TestProviders>{hostNameRenderer(emptyNameHost, FlowTarget.source)}</TestProviders>);
      expect(screen.getByText(getEmptyValue())).toBeInTheDocument();
    });
  });

  describe('#whoisRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const { asFragment } = render(whoisRenderer('10.10.10.10'));

      expect(asFragment()).toMatchSnapshot();
    });
  });

  describe('#reputationRenderer', () => {
    test('it renders correctly against snapshot', () => {
      const { asFragment } = render(
        <TestProviders>{reputationRenderer('10.10.10.10')}</TestProviders>
      );

      expect(asFragment()).toMatchSnapshot();
    });
  });

  describe('DefaultFieldRenderer', () => {
    test('it should render a single item', () => {
      render(
        <TestProviders>
          <DefaultFieldRenderer rowItems={['item1']} attrName={'item1'} idPrefix={'prefix-1'} />
        </TestProviders>
      );
      expect(screen.getByTestId('DefaultFieldRendererComponent').textContent).toEqual('item1 ');
    });

    test('it should render two items', () => {
      render(
        <TestProviders>
          <DefaultFieldRenderer
            displayCount={5}
            rowItems={['item1', 'item2']}
            attrName={'item1'}
            idPrefix={'prefix-1'}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('DefaultFieldRendererComponent').textContent).toEqual(
        'item1,item2 '
      );
    });

    test('it should render all items when the item count exactly equals displayCount', () => {
      render(
        <TestProviders>
          <DefaultFieldRenderer
            displayCount={5}
            rowItems={['item1', 'item2', 'item3', 'item4', 'item5']}
            attrName={'item1'}
            idPrefix={'prefix-1'}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('DefaultFieldRendererComponent').textContent).toEqual(
        'item1,item2,item3,item4,item5 '
      );
    });

    test('it should render all items up to displayCount and the expected "+ n More" popover anchor text for items greater than displayCount', () => {
      render(
        <TestProviders>
          <DefaultFieldRenderer
            displayCount={5}
            rowItems={['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7']}
            attrName={'item1'}
            idPrefix={'prefix-1'}
          />
        </TestProviders>
      );
      expect(screen.getByTestId('DefaultFieldRendererComponent').textContent).toEqual(
        'item1,item2,item3,item4,item5  ,+2 More'
      );
    });
  });

  describe('MoreContainer', () => {
    const idPrefix = 'prefix-1';
    const rowItems = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7'];

    test('it should only render the items after overflowIndexStart', () => {
      render(
        <MoreContainer
          fieldType="keyword"
          idPrefix={idPrefix}
          isAggregatable={true}
          moreMaxHeight={DEFAULT_MORE_MAX_HEIGHT}
          overflowIndexStart={5}
          rowItems={rowItems}
        />
      );

      expect(screen.getByTestId('more-container').textContent).toEqual('item6item7');
    });

    test('it should render all the items when overflowIndexStart is zero', () => {
      render(
        <MoreContainer
          fieldType="keyword"
          idPrefix={idPrefix}
          isAggregatable={true}
          moreMaxHeight={DEFAULT_MORE_MAX_HEIGHT}
          overflowIndexStart={0}
          rowItems={rowItems}
        />
      );

      expect(screen.getByTestId('more-container').textContent).toEqual(
        'item1item2item3item4item5item6item7'
      );
    });

    test('it should have the eui-yScroll to enable scrolling when necessary', () => {
      render(
        <MoreContainer
          fieldType="keyword"
          idPrefix={idPrefix}
          isAggregatable={true}
          moreMaxHeight={DEFAULT_MORE_MAX_HEIGHT}
          overflowIndexStart={5}
          rowItems={rowItems}
        />
      );

      expect(screen.getByTestId('more-container')).toHaveClass('eui-yScroll');
    });

    test('it should use the moreMaxHeight prop as the value for the max-height style', () => {
      render(
        <MoreContainer
          fieldType="keyword"
          idPrefix={idPrefix}
          isAggregatable={true}
          moreMaxHeight={DEFAULT_MORE_MAX_HEIGHT}
          overflowIndexStart={5}
          rowItems={rowItems}
        />
      );

      expect(screen.getByTestId('more-container')).toHaveStyle(
        `max-height: ${DEFAULT_MORE_MAX_HEIGHT}`
      );
    });

    test('it should render with correct attrName prop', () => {
      render(
        <MoreContainer
          fieldType="keyword"
          idPrefix={idPrefix}
          isAggregatable={true}
          moreMaxHeight={DEFAULT_MORE_MAX_HEIGHT}
          overflowIndexStart={5}
          rowItems={rowItems}
          attrName="mock.attr"
        />
      );

      screen
        .getAllByTestId('render-content-mock.attr')
        .forEach((element) => expect(element).toBeInTheDocument());
    });

    test('it should only invoke the optional render function, when provided, for the items after overflowIndexStart', () => {
      const renderFn = jest.fn();

      render(
        <MoreContainer
          fieldType="keyword"
          idPrefix={idPrefix}
          isAggregatable={true}
          moreMaxHeight={DEFAULT_MORE_MAX_HEIGHT}
          overflowIndexStart={5}
          render={renderFn}
          rowItems={rowItems}
        />
      );

      expect(renderFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('DefaultFieldRendererOverflow', () => {
    const idPrefix = 'prefix-1';
    const rowItems = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6', 'item7'];

    test('it should render the length of items after the overflowIndexStart', () => {
      render(
        <TestProviders>
          <DefaultFieldRendererOverflow
            fieldType="keyword"
            idPrefix={idPrefix}
            isAggregatable={true}
            moreMaxHeight={DEFAULT_MORE_MAX_HEIGHT}
            overflowIndexStart={5}
            rowItems={rowItems}
          />
        </TestProviders>
      );

      expect(screen.getByTestId('DefaultFieldRendererOverflow-button').textContent).toEqual(
        '+2 More'
      );
      expect(screen.queryByTestId('more-container')).not.toBeInTheDocument();
    });

    test('it should render the items after overflowIndexStart in the popover', () => {
      render(
        <TestProviders>
          <DefaultFieldRendererOverflow
            fieldType="keyword"
            idPrefix={idPrefix}
            isAggregatable={true}
            moreMaxHeight={DEFAULT_MORE_MAX_HEIGHT}
            overflowIndexStart={5}
            rowItems={rowItems}
          />
        </TestProviders>
      );

      userEvent.click(screen.getByTestId('DefaultFieldRendererOverflow-button'));

      expect(
        screen.getByText('You are in a dialog. To close this dialog, hit escape.')
      ).toBeInTheDocument();
      expect(screen.getByTestId('more-container').textContent).toEqual('item6item7');
    });
  });
});
