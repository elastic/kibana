import type { TooltipInfo } from '@elastic/charts';
import React from 'react';
import type { TimeFormatter } from '../../../../../common/utils/formatters';
/**
 * Custom tooltip for instances latency distribution chart.
 *
 * The styling provided here recreates that in the Elastic Charts tooltip: https://github.com/elastic/elastic-charts/blob/58e6b5fbf77f4471d2a9a41c45a61f79ebd89b65/src/components/tooltip/tooltip.tsx
 *
 * We probably won't need to do all of this once https://github.com/elastic/elastic-charts/issues/615 is completed.
 */
export declare function CustomTooltip(props: TooltipInfo & {
    latencyFormatter: TimeFormatter;
}): React.JSX.Element;
