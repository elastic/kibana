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

import { CellActions, CellActionsMode } from '@kbn/ui-actions-plugin/public';
import type { HostEcs } from '../../../../common/ecs/host';
import type {
  AutonomousSystem,
  FlowTarget,
  FlowTargetSourceDest,
  NetworkDetailsStrategyResponse,
} from '../../../../common/search_strategy';
import { escapeDataProviderId } from '../drag_and_drop/helpers';
import { Content } from '../draggables';
import { defaultToEmptyTag, getEmptyTagValue } from '../empty_value';
import { FormattedRelativePreferenceDate } from '../formatted_date';
import { HostDetailsLink, ReputationLink, WhoIsLink } from '../links';
import { Spacer } from '../page';
import * as i18n from '../../../explore/network/components/details/translations';
import { SECURITY_SOLUTION_ACTION_TRIGGER } from '../../../../common/constants';

const ContainerFlexGroup = styled(EuiFlexGroup)`
  flex-grow: unset;
`;

export const IpOverviewId = 'ip-overview';

/** The default max-height of the popover used to show "+n More" items (e.g. `+9 More`) */
export const DEFAULT_MORE_MAX_HEIGHT = '200px';

export const locationRenderer = (
  fieldNames: string[],
  data: NetworkDetailsStrategyResponse['networkDetails']
): React.ReactElement =>
  fieldNames.length > 0 && fieldNames.every((fieldName) => getOr(null, fieldName, data)) ? (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      {fieldNames.map((fieldName, index) => {
        const locationValue = getOr('', fieldName, data);
        return (
          <Fragment key={`${IpOverviewId}-${fieldName}`}>
            {index ? ',\u00A0' : ''}
            <EuiFlexItem grow={false}>
              <CellActions
                mode={CellActionsMode.HOVER_POPOVER}
                visibleCellActions={5}
                triggerId={SECURITY_SOLUTION_ACTION_TRIGGER}
                field={{
                  type: 'keyword',
                  name: fieldName,
                  value: locationValue,
                }}
              >
                <Content field={fieldName} value={locationValue} />
              </CellActions>
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
  flowTarget: FlowTarget | FlowTargetSourceDest
): React.ReactElement =>
  as && as.organization && as.organization.name && as.number ? (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <CellActions
          mode={CellActionsMode.HOVER_POPOVER}
          visibleCellActions={5}
          triggerId={SECURITY_SOLUTION_ACTION_TRIGGER}
          field={{
            type: 'keyword',
            name: `${flowTarget}.as.organization.name`,
            value: as.organization.name,
          }}
        >
          <Content field={`${flowTarget}.as.organization.name`} value={as.organization.name} />
        </CellActions>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{'/'}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <CellActions
          mode={CellActionsMode.HOVER_POPOVER}
          visibleCellActions={5}
          triggerId={SECURITY_SOLUTION_ACTION_TRIGGER}
          field={{
            type: 'number',
            name: `${flowTarget}.as.number`,
            value: `${as.number}`,
          }}
        >
          <Content field={`${flowTarget}.as.number`} value={`${as.number}`} />
        </CellActions>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    getEmptyTagValue()
  );

interface HostIdRendererTypes {
  contextID?: string;
  host: HostEcs;
  ipFilter?: string;
  noLink?: boolean;
}

export const hostIdRenderer = ({
  host,
  ipFilter,
  noLink,
}: HostIdRendererTypes): React.ReactElement =>
  host.id && host.ip && (ipFilter == null || host.ip.includes(ipFilter)) ? (
    <>
      {host.name && host.name[0] != null ? (
        <CellActions
          mode={CellActionsMode.HOVER_POPOVER}
          visibleCellActions={5}
          triggerId={SECURITY_SOLUTION_ACTION_TRIGGER}
          field={{
            type: 'keyword',
            name: 'host.id',
            value: host.id[0],
          }}
        >
          <Content field={'host.id'} value={host.id[0]}>
            {noLink ? (
              <>{host.id}</>
            ) : (
              <HostDetailsLink hostName={host.name[0]}>{host.id}</HostDetailsLink>
            )}
          </Content>
        </CellActions>
      ) : (
        <>{host.id}</>
      )}
    </>
  ) : (
    getEmptyTagValue()
  );

export const hostNameRenderer = (host?: HostEcs, ipFilter?: string): React.ReactElement =>
  host &&
  host.name &&
  host.name[0] &&
  host.ip &&
  (!(ipFilter != null) || host.ip.includes(ipFilter)) ? (
    <CellActions
      mode={CellActionsMode.HOVER_POPOVER}
      visibleCellActions={5}
      triggerId={SECURITY_SOLUTION_ACTION_TRIGGER}
      field={{
        type: 'keyword',
        name: 'host.name',
        value: host.name[0],
      }}
    >
      <Content field={'host.name'} value={host.name[0]}>
        <HostDetailsLink hostName={host.name[0]}>
          {host.name ? host.name : getEmptyTagValue()}
        </HostDetailsLink>
      </Content>
    </CellActions>
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
  moreMaxHeight?: string;
  render?: (item: string) => React.ReactNode;
  rowItems: string[] | null | undefined;
}

export const DefaultFieldRendererComponent: React.FC<DefaultFieldRendererProps> = ({
  attrName,
  displayCount = 1,
  idPrefix,
  moreMaxHeight = DEFAULT_MORE_MAX_HEIGHT,
  render,
  rowItems,
}) => {
  if (rowItems != null && rowItems.length > 0) {
    const visibleItems = rowItems.slice(0, displayCount).map((rowItem, index) => {
      const id = escapeDataProviderId(
        `default-field-renderer-default-${idPrefix}-${attrName}-${rowItem}`
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
            <CellActions
              mode={CellActionsMode.HOVER_POPOVER}
              visibleCellActions={5}
              triggerId={SECURITY_SOLUTION_ACTION_TRIGGER}
              field={{
                type: 'keyword',
                name: attrName,
                value: rowItem,
              }}
            >
              {render ? render(rowItem) : rowItem}
            </CellActions>
          )}
        </EuiFlexItem>
      );
    });

    return visibleItems.length > 0 ? (
      <ContainerFlexGroup
        alignItems="center"
        gutterSize="none"
        component="span"
        data-test-subj="DefaultFieldRendererComponent"
      >
        <EuiFlexItem grow={false}>{visibleItems} </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DefaultFieldRendererOverflow
            attrName={attrName}
            fieldType="keyword"
            idPrefix={idPrefix}
            moreMaxHeight={moreMaxHeight}
            overflowIndexStart={displayCount}
            render={render}
            rowItems={rowItems}
          />
        </EuiFlexItem>
      </ContainerFlexGroup>
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
  attrName: string;
  fieldType: string;
  rowItems: string[];
  idPrefix: string;
  render?: (item: string) => React.ReactNode;
  overflowIndexStart?: number;
  moreMaxHeight: string;
}

interface MoreContainerProps {
  fieldName: string;
  fieldType: string;
  values: string[];
  idPrefix: string;
  moreMaxHeight: string;
  overflowIndexStart: number;
  render?: (item: string) => React.ReactNode;
}

export const MoreContainer = React.memo<MoreContainerProps>(
  ({ fieldName, fieldType, idPrefix, moreMaxHeight, overflowIndexStart, render, values }) => {
    const moreItemsWithHoverActions = useMemo(
      () =>
        values.slice(overflowIndexStart).reduce<React.ReactElement[]>((acc, value, index) => {
          const id = escapeDataProviderId(`${idPrefix}-${fieldName}-${value}-${index}`);

          if (typeof value === 'string' && fieldName != null) {
            acc.push(
              <EuiFlexItem key={`${idPrefix}-${id}`}>
                <CellActions
                  key={id}
                  mode={CellActionsMode.HOVER_POPOVER}
                  visibleCellActions={5}
                  showActionTooltips
                  triggerId={SECURITY_SOLUTION_ACTION_TRIGGER}
                  field={{
                    name: fieldName,
                    value,
                    type: fieldType,
                  }}
                >
                  <>{render ? render(value) : defaultToEmptyTag(value)}</>
                </CellActions>
              </EuiFlexItem>
            );
          }

          return acc;
        }, []),
      [fieldName, fieldType, idPrefix, overflowIndexStart, render, values]
    );

    const moreItems = useMemo(
      () =>
        values.slice(overflowIndexStart).map((value, index) => {
          return (
            <EuiFlexItem grow={1} key={`${value}-${index}`}>
              {(render && render(value)) ?? defaultToEmptyTag(value)}
            </EuiFlexItem>
          );
        }),
      [overflowIndexStart, render, values]
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
          {fieldName != null ? moreItemsWithHoverActions : moreItems}
        </EuiFlexGroup>
      </div>
    );
  }
);
MoreContainer.displayName = 'MoreContainer';

export const DefaultFieldRendererOverflow = React.memo<DefaultFieldRendererOverflowProps>(
  ({ attrName, idPrefix, moreMaxHeight, overflowIndexStart = 5, render, rowItems, fieldType }) => {
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
              fieldName={attrName}
              idPrefix={idPrefix}
              render={render}
              values={rowItems}
              moreMaxHeight={moreMaxHeight}
              overflowIndexStart={overflowIndexStart}
              fieldType={fieldType}
            />
          </EuiPopover>
        )}
      </EuiFlexItem>
    );
  }
);

DefaultFieldRendererOverflow.displayName = 'DefaultFieldRendererOverflow';
