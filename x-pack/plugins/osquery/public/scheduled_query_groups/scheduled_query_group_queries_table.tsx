/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import {
  TypedLensByValueInput,
  PersistedIndexPatternLayer,
  PieVisualizationState,
} from '../../../lens/public';
import { FilterStateStore } from '../../../../../src/plugins/data/common';
import { useKibana, isModifiedEvent, isLeftClickEvent } from '../common/lib/kibana';
import { PlatformIcons } from './queries/platforms';
import { OsqueryManagerPackagePolicyInputStream } from '../../common/types';

const VIEW_IN_DISCOVER = i18n.translate(
  'xpack.osquery.scheduledQueryGroup.queriesTable.viewDiscoverResultsActionAriaLabel',
  {
    defaultMessage: 'View in Discover',
  }
);

const VIEW_IN_LENS = i18n.translate(
  'xpack.osquery.scheduledQueryGroup.queriesTable.viewLensResultsActionAriaLabel',
  {
    defaultMessage: 'View in Lens',
  }
);

export enum ViewResultsActionButtonType {
  icon = 'icon',
  button = 'button',
}

interface ViewResultsInDiscoverActionProps {
  actionId: string;
  buttonType: ViewResultsActionButtonType;
  endDate?: string;
  startDate?: string;
}

function getLensAttributes(actionId: string): TypedLensByValueInput['attributes'] {
  const dataLayer: PersistedIndexPatternLayer = {
    columnOrder: ['8690befd-fd69-4246-af4a-dd485d2a3b38', 'ed999e9d-204c-465b-897f-fe1a125b39ed'],
    columns: {
      '8690befd-fd69-4246-af4a-dd485d2a3b38': {
        sourceField: 'type',
        isBucketed: true,
        dataType: 'string',
        scale: 'ordinal',
        operationType: 'terms',
        label: 'Top values of type',
        params: {
          otherBucket: true,
          size: 5,
          missingBucket: false,
          orderBy: {
            columnId: 'ed999e9d-204c-465b-897f-fe1a125b39ed',
            type: 'column',
          },
          orderDirection: 'desc',
        },
      },
      'ed999e9d-204c-465b-897f-fe1a125b39ed': {
        sourceField: 'Records',
        isBucketed: false,
        dataType: 'number',
        scale: 'ratio',
        operationType: 'count',
        label: 'Count of records',
      },
    },
    incompleteColumns: {},
  };

  const xyConfig: PieVisualizationState = {
    shape: 'pie',
    layers: [
      {
        legendDisplay: 'default',
        nestedLegend: false,
        layerId: 'layer1',
        layerType: 'data',
        metric: 'ed999e9d-204c-465b-897f-fe1a125b39ed',
        numberDisplay: 'percent',
        groups: ['8690befd-fd69-4246-af4a-dd485d2a3b38'],
        categoryDisplay: 'default',
      },
    ],
  };

  return {
    visualizationType: 'lnsPie',
    title: `Action ${actionId} results`,
    references: [
      {
        id: 'logs-*',
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: 'logs-*',
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
      {
        name: 'filter-index-pattern-0',
        id: 'logs-*',
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates: {
        indexpattern: {
          layers: {
            layer1: dataLayer,
          },
        },
      },
      filters: [
        {
          $state: { store: FilterStateStore.APP_STATE },
          meta: {
            indexRefName: 'filter-index-pattern-0',
            negate: false,
            alias: null,
            disabled: false,
            params: {
              query: actionId,
            },
            type: 'phrase',
            key: 'action_id',
          },
          query: {
            match_phrase: {
              action_id: actionId,
            },
          },
        },
      ],
      query: { language: 'kuery', query: '' },
      visualization: xyConfig,
    },
  };
}

const ViewResultsInLensActionComponent: React.FC<ViewResultsInDiscoverActionProps> = ({
  actionId,
  buttonType,
  endDate,
  startDate,
}) => {
  const lensService = useKibana().services.lens;

  const handleClick = useCallback(
    (event) => {
      const openInNewTab = !(!isModifiedEvent(event) && isLeftClickEvent(event));

      event.preventDefault();

      lensService?.navigateToPrefilledEditor(
        {
          id: '',
          timeRange: {
            from: startDate ?? 'now-1d',
            to: endDate ?? 'now',
            mode: startDate || endDate ? 'absolute' : 'relative',
          },
          attributes: getLensAttributes(actionId),
        },
        {
          openInNewTab,
        }
      );
    },
    [actionId, endDate, lensService, startDate]
  );

  if (buttonType === ViewResultsActionButtonType.button) {
    return (
      <EuiButtonEmpty
        size="xs"
        iconType="lensApp"
        onClick={handleClick}
        disabled={!lensService?.canUseEditor()}
      >
        {VIEW_IN_LENS}
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiToolTip content={VIEW_IN_LENS}>
      <EuiButtonIcon
        iconType="lensApp"
        disabled={!lensService?.canUseEditor()}
        onClick={handleClick}
        aria-label={VIEW_IN_LENS}
      />
    </EuiToolTip>
  );
};

export const ViewResultsInLensAction = React.memo(ViewResultsInLensActionComponent);

const ViewResultsInDiscoverActionComponent: React.FC<ViewResultsInDiscoverActionProps> = ({
  actionId,
  buttonType,
  endDate,
  startDate,
}) => {
  const urlGenerator = useKibana().services.discover?.urlGenerator;
  const [discoverUrl, setDiscoverUrl] = useState<string>('');

  useEffect(() => {
    const getDiscoverUrl = async () => {
      if (!urlGenerator?.createUrl) return;

      const newUrl = await urlGenerator.createUrl({
        indexPatternId: 'logs-*',
        filters: [
          {
            meta: {
              index: 'logs-*',
              alias: null,
              negate: false,
              disabled: false,
              type: 'phrase',
              key: 'action_id',
              params: { query: actionId },
            },
            query: { match_phrase: { action_id: actionId } },
            $state: { store: FilterStateStore.APP_STATE },
          },
        ],
        refreshInterval: {
          pause: true,
          value: 0,
        },
        timeRange:
          startDate && endDate
            ? {
                to: endDate,
                from: startDate,
                mode: 'absolute',
              }
            : {
                to: 'now',
                from: 'now-1d',
                mode: 'relative',
              },
      });
      setDiscoverUrl(newUrl);
    };
    getDiscoverUrl();
  }, [actionId, endDate, startDate, urlGenerator]);

  if (buttonType === ViewResultsActionButtonType.button) {
    return (
      <EuiButtonEmpty size="xs" iconType="discoverApp" href={discoverUrl}>
        {VIEW_IN_DISCOVER}
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiToolTip content={VIEW_IN_DISCOVER}>
      <EuiButtonIcon iconType="discoverApp" href={discoverUrl} aria-label={VIEW_IN_DISCOVER} />
    </EuiToolTip>
  );
};

export const ViewResultsInDiscoverAction = React.memo(ViewResultsInDiscoverActionComponent);

interface ScheduledQueryGroupQueriesTableProps {
  data: OsqueryManagerPackagePolicyInputStream[];
  editMode?: boolean;
  onDeleteClick?: (item: OsqueryManagerPackagePolicyInputStream) => void;
  onEditClick?: (item: OsqueryManagerPackagePolicyInputStream) => void;
  selectedItems?: OsqueryManagerPackagePolicyInputStream[];
  setSelectedItems?: (selection: OsqueryManagerPackagePolicyInputStream[]) => void;
}

const ScheduledQueryGroupQueriesTableComponent: React.FC<ScheduledQueryGroupQueriesTableProps> = ({
  data,
  editMode = false,
  onDeleteClick,
  onEditClick,
  selectedItems,
  setSelectedItems,
}) => {
  const renderDeleteAction = useCallback(
    (item: OsqueryManagerPackagePolicyInputStream) => (
      <EuiButtonIcon
        color="danger"
        // @ts-expect-error update types
        // eslint-disable-next-line react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop
        onClick={() => onDeleteClick(item)}
        iconType="trash"
        aria-label={i18n.translate(
          'xpack.osquery.scheduledQueryGroup.queriesTable.deleteActionAriaLabel',
          {
            defaultMessage: 'Delete {queryName}',
            values: {
              queryName: item.vars?.id.value,
            },
          }
        )}
      />
    ),
    [onDeleteClick]
  );

  const renderEditAction = useCallback(
    (item: OsqueryManagerPackagePolicyInputStream) => (
      <EuiButtonIcon
        color="primary"
        // @ts-expect-error update types
        // eslint-disable-next-line react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop
        onClick={() => onEditClick(item)}
        iconType="pencil"
        aria-label={i18n.translate(
          'xpack.osquery.scheduledQueryGroup.queriesTable.editActionAriaLabel',
          {
            defaultMessage: 'Edit {queryName}',
            values: {
              queryName: item.vars?.id.value,
            },
          }
        )}
      />
    ),
    [onEditClick]
  );

  const renderQueryColumn = useCallback(
    (query: string) => (
      <EuiCodeBlock language="sql" fontSize="s" paddingSize="none" transparentBackground>
        {query}
      </EuiCodeBlock>
    ),
    []
  );

  const renderPlatformColumn = useCallback(
    (platform: string) => <PlatformIcons platform={platform} />,
    []
  );

  const renderVersionColumn = useCallback(
    (version: string) =>
      version
        ? `${version}`
        : i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.osqueryVersionAllLabel', {
            defaultMessage: 'ALL',
          }),
    []
  );

  const renderDiscoverResultsAction = useCallback(
    (item) => (
      <ViewResultsInDiscoverAction
        actionId={item.vars?.id.value}
        buttonType={ViewResultsActionButtonType.icon}
      />
    ),
    []
  );

  const renderLensResultsAction = useCallback(
    (item) => (
      <ViewResultsInLensAction
        actionId={item.vars?.id.value}
        buttonType={ViewResultsActionButtonType.icon}
      />
    ),
    []
  );

  const columns = useMemo(
    () => [
      {
        field: 'vars.id.value',
        name: i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.idColumnTitle', {
          defaultMessage: 'ID',
        }),
        width: '20%',
      },
      {
        field: 'vars.interval.value',
        name: i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.intervalColumnTitle', {
          defaultMessage: 'Interval (s)',
        }),
        width: '100px',
      },
      {
        field: 'vars.query.value',
        name: i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.queryColumnTitle', {
          defaultMessage: 'Query',
        }),
        render: renderQueryColumn,
      },
      {
        field: 'vars.platform.value',
        name: i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.platformColumnTitle', {
          defaultMessage: 'Platform',
        }),
        render: renderPlatformColumn,
      },
      {
        field: 'vars.version.value',
        name: i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.versionColumnTitle', {
          defaultMessage: 'Min Osquery version',
        }),
        render: renderVersionColumn,
      },
      {
        name: editMode
          ? i18n.translate('xpack.osquery.scheduledQueryGroup.queriesTable.actionsColumnTitle', {
              defaultMessage: 'Actions',
            })
          : i18n.translate(
              'xpack.osquery.scheduledQueryGroup.queriesTable.viewResultsColumnTitle',
              {
                defaultMessage: 'View results',
              }
            ),
        width: '120px',
        actions: editMode
          ? [
              {
                render: renderEditAction,
              },
              {
                render: renderDeleteAction,
              },
            ]
          : [
              {
                render: renderDiscoverResultsAction,
              },
              {
                render: renderLensResultsAction,
              },
            ],
      },
    ],
    [
      editMode,
      renderDeleteAction,
      renderDiscoverResultsAction,
      renderEditAction,
      renderLensResultsAction,
      renderPlatformColumn,
      renderQueryColumn,
      renderVersionColumn,
    ]
  );

  const sorting = useMemo(
    () => ({
      sort: {
        field: 'vars.id.value' as keyof OsqueryManagerPackagePolicyInputStream,
        direction: 'asc' as const,
      },
    }),
    []
  );

  const itemId = useCallback(
    (item: OsqueryManagerPackagePolicyInputStream) => get('vars.id.value', item),
    []
  );

  const selection = useMemo(
    () => ({
      onSelectionChange: setSelectedItems,
      initialSelected: selectedItems,
    }),
    [selectedItems, setSelectedItems]
  );

  return (
    <EuiBasicTable<OsqueryManagerPackagePolicyInputStream>
      items={data}
      itemId={itemId}
      columns={columns}
      sorting={sorting}
      selection={editMode ? selection : undefined}
      isSelectable={editMode}
    />
  );
};

export const ScheduledQueryGroupQueriesTable = React.memo(ScheduledQueryGroupQueriesTableComponent);
