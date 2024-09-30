/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiSteps,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import useAsync from 'react-use/lib/useAsync';
import { useKibana } from '../../hooks/use_kibana';
import { InventoryPageHeader } from '../inventory_page_header';
import { InventoryPageHeaderTitle } from '../inventory_page_header/inventory_page_header_title';
import { RoutingDetails } from '../data_stream_management_view/physical_management';

function ManagementOverviewViewContent() {
  const {
    core: { http },
  } = useKibana();

  return (
    <>
      <EuiFlexGroup direction="column" alignItems="stretch">
        <EuiButton
          data-test-subj="inventoryManagementOverviewViewContentEnableTracingOnIngestPipelinesButton"
          onClick={async () => {
            await http.post('/api/track_pipelines');
            alert('Tracing enabled');
          }}
        >
          {i18n.translate(
            'xpack.inventory.managementOverviewViewContent.enableTracingOnIngestButtonLabel',
            { defaultMessage: 'Enable tracing on ingest pipelines' }
          )}
        </EuiButton>
        <MainPipelineView forceFilterUnused={false} />
        {/* <RoutingDetails height={700} /> */}
      </EuiFlexGroup>
    </>
  );
}

export interface ExecutionCounts {
  total: number;
  perPipeline: Record<string, number>;
}

export function MainPipelineView({
  executionCounts,
  forceFilterUnused,
}: {
  executionCounts?: ExecutionCounts;
  forceFilterUnused?: boolean;
}) {
  const {
    core: { http },
  } = useKibana();

  const mainPipeline = useAsync(async () => {
    return await http.get('/api/main_pipeline');
  }, [http]);

  if (mainPipeline.loading) {
    return <EuiLoadingSpinner />;
  }

  if (mainPipeline.error) {
    return (
      <div>
        {i18n.translate('xpack.inventory.mainPipelineView.div.errorLabel', {
          defaultMessage: 'Error:',
        })}
        {mainPipeline.error.message}
      </div>
    );
  }

  return (
    <div>
      <Processors
        processors={mainPipeline.value.processors}
        executionCounts={executionCounts}
        forceFilterUnused={forceFilterUnused}
      />
    </div>
  );
}

function Processors({
  processors,
  executionCounts,
  forceFilterUnused,
}: {
  processors: any[];
  executionCounts?: ExecutionCounts;
  forceFilterUnused?: boolean;
}) {
  const [filterUnused, setFilterUnused] = React.useState(true);
  const filterUnusedFinal = forceFilterUnused ?? filterUnused;
  const steps = filterProcessors(processors)
    .filter(
      (p) => !p.pipeline || !filterUnusedFinal || executionCounts?.perPipeline[p.pipeline?.name]
    )
    .map((p) => ({
      title: p.pipeline?.name || Object.keys(p)[0],
      children: (
        <>
          {p.pipeline ? (
            <>
              <EuiText>
                {p.pipeline.if ? (
                  <p>
                    {i18n.translate('xpack.inventory.steps.p.conditionLabel', {
                      defaultMessage: 'Condition:',
                    })}
                    {p.pipeline.if}
                  </p>
                ) : (
                  <p>
                    {i18n.translate('xpack.inventory.steps.p.calledUnconditionallyLabel', {
                      defaultMessage: 'Called unconditionally',
                    })}
                  </p>
                )}
                {executionCounts && (
                  <EuiBadge
                    color={executionCounts.perPipeline[p.pipeline.name] ? 'success' : undefined}
                  >{`Executed ${
                    ((executionCounts.perPipeline[p.pipeline.name] || 0) / executionCounts.total) *
                    100
                  }% of time`}</EuiBadge>
                )}
              </EuiText>
              {p.pipeline.subProcessors && p.pipeline.subProcessors.length && (
                <EuiAccordion id={`subs_${p.name}`} buttonContent="Sub-Processors">
                  <Processors
                    processors={p.pipeline.subProcessors}
                    executionCounts={executionCounts}
                    forceFilterUnused={filterUnusedFinal}
                  />
                </EuiAccordion>
              )}
            </>
          ) : (
            <>
              <pre>{JSON.stringify(p, null, 2)}</pre>
            </>
          )}
        </>
      ),
    }));

  return (
    <>
      {executionCounts && forceFilterUnused === undefined && (
        <EuiSwitch
          label={i18n.translate(
            'xpack.inventory.processors.euiSwitch.filterUnusedProcessorsLabel',
            {
              defaultMessage: 'Filter unused pipelines',
            }
          )}
          checked={filterUnused}
          onChange={() => setFilterUnused(!filterUnused)}
        />
      )}
      <EuiSteps steps={steps} />
    </>
  );
}

function filterProcessors(processors: any[]) {
  return processors.filter((p) => {
    if (p.append?.tag === 'track-pipeline-invocation') return false;
    if (p.script?.source === 'ctx.__original_doc = ctx') return false;
    if (p.remove?.field === '__original_doc') return false;
    if (p.reroute) return false;
    return true;
  });
}

export function ManagementOverviewView() {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <InventoryPageHeader>
        <InventoryPageHeaderTitle
          title={i18n.translate('xpack.inventory.definitionsOverview.pageTitle', {
            defaultMessage: 'Management',
          })}
        />
      </InventoryPageHeader>
      <ManagementOverviewViewContent />
    </EuiFlexGroup>
  );
}
