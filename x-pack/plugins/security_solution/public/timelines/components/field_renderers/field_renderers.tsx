/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { getOr } from 'lodash/fp';
import React, { useCallback, Fragment, useMemo, useState } from 'react';
import styled from 'styled-components';

import type { HostEcs } from '@kbn/securitysolution-ecs';
import type {
  AutonomousSystem,
  FlowTarget,
  FlowTargetSourceDest,
  NetworkDetailsStrategyResponse,
} from '../../../../common/search_strategy';
import { escapeDataProviderId } from '../../../common/components/drag_and_drop/helpers';
import { DefaultDraggable } from '../../../common/components/draggables';
import { defaultToEmptyTag, getEmptyTagValue } from '../../../common/components/empty_value';
import { FormattedRelativePreferenceDate } from '../../../common/components/formatted_date';
import { HostDetailsLink, ReputationLink, WhoIsLink } from '../../../common/components/links';
import { Spacer } from '../../../common/components/page';
import * as i18n from '../../../explore/network/components/details/translations';
import type { QueryOperator } from '../../../../common/types';
import { IS_OPERATOR } from '../../../../common/types';
import { DraggableWrapper } from '../../../common/components/drag_and_drop/draggable_wrapper';

const DraggableContainerFlexGroup = styled(EuiFlexGroup)`
  flex-grow: unset;
`;

export const IpOverviewId = 'ip-overview';

/** The default max-height of the popover used to show "+n More" items (e.g. `+9 More`) */
export const DEFAULT_MORE_MAX_HEIGHT = '200px';

export const locationRenderer = (
  fieldNames: string[],
  data: NetworkDetailsStrategyResponse['networkDetails'],
  contextID?: string,
  isDraggable?: boolean
): React.ReactElement =>
  fieldNames.length > 0 && fieldNames.every((fieldName) => getOr(null, fieldName, data)) ? (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      {fieldNames.map((fieldName, index) => {
        const locationValue = getOr('', fieldName, data);
        return (
          <Fragment key={`${IpOverviewId}-${fieldName}`}>
            {index ? ',\u00A0' : ''}
            <EuiFlexItem grow={false}>
              <DefaultDraggable
                id={`location-renderer-default-draggable-${IpOverviewId}-${
                  contextID ? `${contextID}-` : ''
                }${fieldName}`}
                isDraggable={isDraggable ?? false}
                field={fieldName}
                value={locationValue}
                isAggregatable={true}
                fieldType={'keyword'}
              />
            </EuiFlexItem>
          </Fragment>
        );
      })}
    </EuiFlexGroup>
  ) : (
    getEmptyTagValue()
  );

export const dateRenderer = (timestamp?: string | null): React.ReactElement => (
  <FormattedRelativePreferenceDate value={timestamp} />
);

export const autonomousSystemRenderer = (
  as: AutonomousSystem,
  flowTarget: FlowTarget | FlowTargetSourceDest,
  contextID?: string,
  isDraggable?: boolean
): React.ReactElement =>
  as && as.organization && as.organization.name && as.number ? (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <DefaultDraggable
          id={`autonomous-system-renderer-default-draggable-${IpOverviewId}-${
            contextID ? `${contextID}-` : ''
          }${flowTarget}.as.organization.name`}
          isDraggable={isDraggable ?? false}
          field={`${flowTarget}.as.organization.name`}
          value={as.organization.name}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{'/'}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <DefaultDraggable
          id={`autonomous-system-renderer-default-draggable-${IpOverviewId}-${
            contextID ? `${contextID}-` : ''
          }${flowTarget}.as.number`}
          isDraggable={false}
          field={`${flowTarget}.as.number`}
          value={`${as.number}`}
          isAggregatable={true}
          fieldType={'number'}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    getEmptyTagValue()
  );

interface HostIdRendererTypes {
  contextID?: string;
  host: HostEcs;
  ipFilter?: string;
  isDraggable?: boolean;
  noLink?: boolean;
}

export const hostIdRenderer = ({
  contextID,
  host,
  isDraggable = false,
  ipFilter,
  noLink,
}: HostIdRendererTypes): React.ReactElement =>
  host.id && host.ip && (ipFilter == null || host.ip.includes(ipFilter)) ? (
    <>
      {host.name && host.name[0] != null ? (
        <DefaultDraggable
          id={`host-id-renderer-default-draggable-${IpOverviewId}-${
            contextID ? `${contextID}-` : ''
          }host-id`}
          isDraggable={isDraggable}
          field="host.id"
          value={host.id[0]}
          isAggregatable={true}
          fieldType={'keyword'}
        >
          {noLink ? (
            <>{host.id}</>
          ) : (
            <HostDetailsLink hostName={host.name[0]}>{host.id}</HostDetailsLink>
          )}
        </DefaultDraggable>
      ) : (
        <>{host.id}</>
      )}
    </>
  ) : (
    getEmptyTagValue()
  );

export const hostNameRenderer = (
  host?: HostEcs,
  ipFilter?: string,
  contextID?: string,
  isDraggable?: boolean
): React.ReactElement =>
  host &&
  host.name &&
  host.name[0] &&
  host.ip &&
  (!(ipFilter != null) || host.ip.includes(ipFilter)) ? (
    <DefaultDraggable
      id={`host-name-renderer-default-draggable-${IpOverviewId}-${
        contextID ? `${contextID}-` : ''
      }host-name`}
      isDraggable={isDraggable ?? false}
      field={'host.name'}
      value={host.name[0]}
      isAggregatable={true}
      fieldType={'keyword'}
    >
      <HostDetailsLink hostName={host.name[0]}>
        {host.name ? host.name : getEmptyTagValue()}
      </HostDetailsLink>
    </DefaultDraggable>
  ) : (
    getEmptyTagValue()
  );

export const whoisRenderer = (ip: string) => <WhoIsLink domain={ip}>{i18n.VIEW_WHOIS}</WhoIsLink>;

export const reputationRenderer = (ip: string): React.ReactElement => (
  <ReputationLink domain={ip} direction="column" />
);

interface DefaultFieldRendererProps {
  attrName: string;
  displayCount?: number;
  idPrefix: string;
  isDraggable?: boolean;
  moreMaxHeight?: string;
  render?: (item: string) => React.ReactNode;
  rowItems: string[] | null | undefined;
}

export const DefaultFieldRendererComponent: React.FC<DefaultFieldRendererProps> = ({
  attrName,
  displayCount = 1,
  idPrefix,
  isDraggable = false,
  moreMaxHeight = DEFAULT_MORE_MAX_HEIGHT,
  render,
  rowItems,
}) => {
  if (rowItems != null && rowItems.length > 0) {
    const draggables = rowItems.slice(0, displayCount).map((rowItem, index) => {
      const id = escapeDataProviderId(
        `default-field-renderer-default-draggable-${idPrefix}-${attrName}-${rowItem}`
      );
      return (
        <EuiFlexItem key={id} grow={false}>
          {index !== 0 && (
            <>
              {','}
              <Spacer />
            </>
          )}
          {typeof rowItem === 'string' && (
            <DefaultDraggable
              id={id}
              isDraggable={isDraggable}
              field={attrName}
              value={rowItem}
              isAggregatable={true}
              fieldType={'keyword'}
            >
              {render ? render(rowItem) : rowItem}
            </DefaultDraggable>
          )}
        </EuiFlexItem>
      );
    });

    return draggables.length > 0 ? (
      <DraggableContainerFlexGroup
        alignItems="center"
        gutterSize="none"
        component="span"
        data-test-subj="DefaultFieldRendererComponent"
      >
        <EuiFlexItem grow={false}>{draggables} </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DefaultFieldRendererOverflow
            attrName={attrName}
            fieldType="keyword"
            idPrefix={idPrefix}
            isAggregatable={true}
            moreMaxHeight={moreMaxHeight}
            overflowIndexStart={displayCount}
            render={render}
            rowItems={rowItems}
          />
        </EuiFlexItem>
      </DraggableContainerFlexGroup>
    ) : (
      getEmptyTagValue()
    );
  } else {
    return getEmptyTagValue();
  }
};

export const DefaultFieldRenderer = React.memo(DefaultFieldRendererComponent);

DefaultFieldRenderer.displayName = 'DefaultFieldRenderer';

interface DefaultFieldRendererOverflowProps {
  attrName?: string;
  fieldType?: string;
  rowItems: string[];
  idPrefix: string;
  isAggregatable?: boolean;
  render?: (item: string) => React.ReactNode;
  overflowIndexStart?: number;
  moreMaxHeight: string;
}

interface MoreContainerProps {
  attrName?: string;
  dragDisplayValue?: string;
  fieldType?: string;
  idPrefix: string;
  isAggregatable?: boolean;
  moreMaxHeight: string;
  overflowIndexStart: number;
  render?: (item: string) => React.ReactNode;
  rowItems: string[];
}

/** A container (with overflow) for showing "More" items in a popover */
export const MoreContainer = React.memo<MoreContainerProps>(
  ({
    attrName,
    dragDisplayValue,
    fieldType,
    idPrefix,
    isAggregatable,
    moreMaxHeight,
    overflowIndexStart,
    render,
    rowItems,
  }) => {
    const moreItemsWithHoverActions = useMemo(
      () =>
        rowItems.slice(overflowIndexStart).reduce<React.ReactElement[]>((acc, rowItem, index) => {
          const id = escapeDataProviderId(`${idPrefix}-${attrName}-${rowItem}-${index}`);
          const dataProvider =
            typeof rowItem === 'string' && attrName != null
              ? {
                  and: [],
                  enabled: true,
                  id,
                  name: rowItem,
                  excluded: false,
                  kqlQuery: '',
                  queryMatch: {
                    field: attrName,
                    value: rowItem,
                    displayValue: dragDisplayValue ?? rowItem,
                    operator: IS_OPERATOR as QueryOperator,
                  },
                }
              : undefined;

          if (dataProvider != null) {
            acc.push(
              <EuiFlexItem key={`${idPrefix}-${id}`}>
                <DraggableWrapper
                  dataProvider={dataProvider}
                  isDraggable={false}
                  render={() => (render && render(rowItem)) ?? defaultToEmptyTag(rowItem)}
                  scopeId={undefined}
                  fieldType={fieldType}
                  isAggregatable={isAggregatable}
                />
              </EuiFlexItem>
            );
          }

          return acc;
        }, []),
      [
        attrName,
        dragDisplayValue,
        fieldType,
        idPrefix,
        isAggregatable,
        overflowIndexStart,
        render,
        rowItems,
      ]
    );

    const moreItems = useMemo(
      () =>
        rowItems.slice(overflowIndexStart).map((rowItem, index) => {
          return (
            <EuiFlexItem grow={1} key={`${rowItem}-${index}`}>
              {(render && render(rowItem)) ?? defaultToEmptyTag(rowItem)}
            </EuiFlexItem>
          );
        }),
      [overflowIndexStart, render, rowItems]
    );

    return (
      <div
        data-test-subj="more-container"
        className="eui-yScroll"
        style={{
          maxHeight: moreMaxHeight,
          paddingRight: '2px',
        }}
      >
        <EuiFlexGroup gutterSize="s" direction="column" data-test-subj="overflow-items">
          {attrName != null ? moreItemsWithHoverActions : moreItems}
        </EuiFlexGroup>
      </div>
    );
  }
);
MoreContainer.displayName = 'MoreContainer';

export const DefaultFieldRendererOverflow = React.memo<DefaultFieldRendererOverflowProps>(
  ({
    attrName,
    idPrefix,
    moreMaxHeight,
    overflowIndexStart = 5,
    render,
    rowItems,
    fieldType,
    isAggregatable,
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const togglePopover = useCallback(() => setIsOpen((currentIsOpen) => !currentIsOpen), []);
    const button = useMemo(
      () => (
        <>
          {' ,'}
          <EuiButtonEmpty
            size="xs"
            onClick={togglePopover}
            data-test-subj="DefaultFieldRendererOverflow-button"
          >
            {`+${rowItems.length - overflowIndexStart} `}
            <FormattedMessage
              id="xpack.securitySolution.fieldRenderers.moreLabel"
              defaultMessage="More"
            />
          </EuiButtonEmpty>
        </>
      ),
      [togglePopover, overflowIndexStart, rowItems.length]
    );

    return (
      <EuiFlexItem grow={false}>
        {rowItems.length > overflowIndexStart && (
          <EuiPopover
            id="popover"
            button={button}
            isOpen={isOpen}
            closePopover={togglePopover}
            repositionOnScroll
            panelClassName="withHoverActions__popover"
          >
            <MoreContainer
              attrName={attrName}
              idPrefix={idPrefix}
              render={render}
              rowItems={rowItems}
              moreMaxHeight={moreMaxHeight}
              overflowIndexStart={overflowIndexStart}
              fieldType={fieldType}
              isAggregatable={isAggregatable}
            />
          </EuiPopover>
        )}
      </EuiFlexItem>
    );
  }
);

DefaultFieldRendererOverflow.displayName = 'DefaultFieldRendererOverflow';
