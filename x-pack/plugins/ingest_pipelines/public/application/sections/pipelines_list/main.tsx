/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { Location } from 'history';
import { parse } from 'query-string';

import {
  EuiPageHeader,
  EuiPageTemplate,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiFilterSelectItem,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { Pipeline } from '../../../../common/types';
import { useKibana, SectionLoading } from '../../../shared_imports';
import { UIM_PIPELINES_LIST_LOAD } from '../../constants';
import { getEditPath, getClonePath, getListPath } from '../../services/navigation';

import { EmptyList } from './empty_list';
import { PipelineTable } from './table';
import { PipelineDetailsFlyout } from './details_flyout';
import { PipelineNotFoundFlyout } from './not_found_flyout';
import { PipelineDeleteModal } from './delete_modal';
import { useRedirectToPathOrRedirectPath } from '../../hooks';

interface Filter {
  name: string;
  checked: 'on' | 'off';
}

interface Props<T extends string> {
  filters: Filters<T>;
  onChange(filters: Filters<T>): void;
}

type Filters<T extends string> = {
  [key in T]: Filter;
};

export function FilterListButton<T extends string>({ onChange, filters }: Props<T>) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const activeFilters = Object.values(filters).filter((v) => (v as Filter).checked === 'on');

  const onButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const toggleFilter = (filter: T) => {
    const previousValue = filters[filter].checked;
    onChange({
      ...filters,
      [filter]: {
        ...filters[filter],
        checked: previousValue === 'on' ? 'off' : 'on',
      },
    });
  };

  const button = (
    <EuiFilterButton
      iconType="arrowDown"
      onClick={onButtonClick}
      isSelected={isPopoverOpen}
      numFilters={Object.keys(filters).length}
      hasActiveFilters={activeFilters.length > 0}
      numActiveFilters={activeFilters.length}
      data-test-subj="viewButton"
    >
      <FormattedMessage
        id="xpack.ingestPipelines.indexTemplatesList.viewButtonLabel"
        defaultMessage="View"
      />
    </EuiFilterButton>
  );

  return (
    <EuiFilterGroup>
      <EuiPopover
        ownFocus
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
        data-test-subj="filterList"
      >
        <div className="euiFilterSelect__items">
          {Object.entries(filters).map(([filter, item], index) => {
            const { checked, name } = item as Filter;
            const testName = name.toLowerCase().replaceAll(' ', '_');

            return (
              <EuiFilterSelectItem
                checked={checked}
                key={index}
                onClick={() => toggleFilter(filter as T)}
                data-test-subj={`filterItem-${testName}`}
              >
                {name}
              </EuiFilterSelectItem>
            );
          })}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
}

const getPipelineNameFromLocation = (location: Location) => {
  const { pipeline } = parse(location.search.substring(1));
  return pipeline;
};

type FilterName = 'managed' | 'notManaged';

export const PipelinesList: React.FunctionComponent<RouteComponentProps> = ({
  history,
  location,
}) => {
  const { services } = useKibana();
  const pipelineNameFromLocation = getPipelineNameFromLocation(location);

  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | undefined>(undefined);
  const [showFlyout, setShowFlyout] = useState<boolean>(false);

  const [pipelinesToDelete, setPipelinesToDelete] = useState<string[]>([]);

  const { data, isLoading, error, resendRequest } = services.api.useLoadPipelines();
  const redirectToPathOrRedirectPath = useRedirectToPathOrRedirectPath(history);

  // Track component loaded
  useEffect(() => {
    services.metric.trackUiMetric(UIM_PIPELINES_LIST_LOAD);
    services.breadcrumbs.setBreadcrumbs('home');
  }, [services.metric, services.breadcrumbs]);

  useEffect(() => {
    if (pipelineNameFromLocation && data?.length) {
      const pipeline = data.find((p) => p.name === pipelineNameFromLocation);
      setSelectedPipeline(pipeline);
      setShowFlyout(true);
    }
  }, [pipelineNameFromLocation, data]);

  const goToEditPipeline = (pipelineName: string) => {
    history.push(getEditPath({ pipelineName }));
  };

  const goToClonePipeline = (clonedPipelineName: string) => {
    history.push(getClonePath({ clonedPipelineName }));
  };

  const goHome = () => {
    setShowFlyout(false);
    redirectToPathOrRedirectPath(getListPath());
  };

  const [filters, setFilters] = useState<Filters<FilterName>>({
    managed: {
      name: i18n.translate('xpack.idxMgmt.indexTemplatesList.viewManagedTemplateLabel', {
        defaultMessage: 'Managed pipelines',
      }),
      checked: 'on',
    },
    notManaged: {
      name: i18n.translate('xpack.idxMgmt.indexTemplatesList.viewNotManagedTemplateLabel', {
        defaultMessage: 'Custom pipelines',
      }),
      checked: 'on',
    },
  });

  const handleFilters = () => {
    const activeFilters = {
      managed: filters.managed.checked === 'on',
      notManaged: filters.notManaged.checked === 'on',
    };
    const filteredPipelines = data;

    return filteredPipelines?.filter((pipeline) => {
      if (activeFilters.managed && pipeline.isManaged) return true;
      if (activeFilters.notManaged && !pipeline.isManaged) return true;
      return false;
    });
  };
  const allPipelines = handleFilters();

  if (error) {
    return (
      <EuiPageTemplate.EmptyPrompt
        color="danger"
        iconType="warning"
        title={
          <h2 data-test-subj="pipelineLoadError">
            <FormattedMessage
              id="xpack.ingestPipelines.list.loadErrorTitle"
              defaultMessage="Unable to load pipelines"
            />
          </h2>
        }
        body={<p>{error.message}</p>}
        actions={
          <EuiButton onClick={resendRequest} iconType="refresh" color="danger">
            <FormattedMessage
              id="xpack.ingestPipelines.list.loadPipelineReloadButton"
              defaultMessage="Try again"
            />
          </EuiButton>
        }
      />
    );
  }

  if (isLoading) {
    return (
      <SectionLoading data-test-subj="sectionLoading">
        <FormattedMessage
          id="xpack.ingestPipelines.list.loadingMessage"
          defaultMessage="Loading pipelines..."
        />
      </SectionLoading>
    );
  }

  if (data && data.length === 0) {
    return <EmptyList />;
  }

  const renderFlyout = (): React.ReactNode => {
    if (!showFlyout) {
      return;
    }
    if (selectedPipeline) {
      return (
        <PipelineDetailsFlyout
          pipeline={selectedPipeline}
          onClose={() => {
            setSelectedPipeline(undefined);
            goHome();
          }}
          onEditClick={goToEditPipeline}
          onCloneClick={goToClonePipeline}
          onDeleteClick={setPipelinesToDelete}
        />
      );
    } else {
      // Somehow we triggered show pipeline details, but do not have a pipeline.
      // We assume not found.
      return <PipelineNotFoundFlyout onClose={goHome} pipelineName={pipelineNameFromLocation} />;
    }
  };

  return (
    <>
      <EuiPageHeader
        bottomBorder
        pageTitle={
          <span data-test-subj="appTitle">
            <FormattedMessage
              id="xpack.ingestPipelines.list.listTitle"
              defaultMessage="Ingest Pipelines"
            />
          </span>
        }
        description={
          <FormattedMessage
            id="xpack.ingestPipelines.list.pipelinesDescription"
            defaultMessage="Use pipelines to remove or transform fields, extract values from text, and enrich your data before indexing."
          />
        }
        rightSideItems={[
          <EuiButtonEmpty
            href={services.documentation.getIngestNodeUrl()}
            target="_blank"
            iconType="help"
            data-test-subj="documentationLink"
          >
            <FormattedMessage
              id="xpack.ingestPipelines.list.pipelinesDocsLinkText"
              defaultMessage="Ingest Pipelines docs"
            />
          </EuiButtonEmpty>,
        ]}
      />

      <EuiSpacer size="l" />

      <PipelineTable
        onReloadClick={resendRequest}
        onEditPipelineClick={goToEditPipeline}
        onDeletePipelineClick={setPipelinesToDelete}
        onClonePipelineClick={goToClonePipeline}
        pipelines={allPipelines as Pipeline[]}
        filterListButton={<FilterListButton<FilterName> filters={filters} onChange={setFilters} />}
      />

      {renderFlyout()}
      {pipelinesToDelete?.length > 0 ? (
        <PipelineDeleteModal
          callback={(deleteResponse) => {
            if (deleteResponse?.hasDeletedPipelines) {
              // reload pipelines list
              resendRequest();
              setSelectedPipeline(undefined);
              goHome();
            }
            setPipelinesToDelete([]);
          }}
          pipelinesToDelete={pipelinesToDelete}
        />
      ) : null}
    </>
  );
};
