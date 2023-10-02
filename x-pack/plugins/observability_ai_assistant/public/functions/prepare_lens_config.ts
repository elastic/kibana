import {
  HeatmapChart,
  HeatmapLayer,
  LensAttributesBuilder,
  MetricChart,
  MetricLayer, PieChart,
  PieLayer,
  XYChart,
  XYDataLayer
} from "@kbn/lens-embeddable-utils";
import {Assign} from "utility-types";
import {LensEmbeddableInput, LensPublicStart} from "@kbn/lens-plugin/public";

export const getLensConfig = async (lens: LensPublicStart, dataViews, { indexPattern, timeField, start, end, layers, seriesType, breakdown, breakdown_x, legend, chartType }) => {

  const formula = await lens.stateHelperApi();

  const dataView = await dataViews.create({
    title: indexPattern,
    timeFieldName: timeField,
  });

  const createVisualization = () => {
    const layer = layers[0];
    switch (chartType) {
      default:
        const xyDataLayer = new XYDataLayer({
          data: layers.map((l) => ({
            type: 'formula',
            value: l.formula,
            label: l.label,
            format: l.format,
            seriesType: l.seriesType,
            showGridLines: l.showGridLines,
            filter: {
              language: 'kql',
              query: l.filter ?? '',
            },
          })),
          options: {
            buckets: timeField ? { type: 'date_histogram', field: timeField } : undefined,
            breakdown: breakdown
              ? { type: 'top_values', params: { size: 10 }, field: breakdown }
              : undefined,
          },
        });

        return new XYChart({
          visualOptions: {
            legend,
          },
          layers: [xyDataLayer],
          formulaAPI: formula.formula,
          dataView: dataView,
        });
      case 'metric':
        const metricLayer = new MetricLayer({
          data: {
            value: layer.formula,
            label: layer.label,
            format: layer.format,
            filter: {
              language: 'kql',
              query: layer.filter ?? '',
            },
          },
          options: {
            showTitle: true,
          },
        });

        return new MetricChart({
          layers: metricLayer,
          formulaAPI: formula.formula,
          dataView: dataView,
        });
      case 'pie':
        const pieLayer = new PieLayer({
          data: layers.map((l) => ({
            value: layer.formula,
            label: layer.label,
            format: layer.format,
            filter: {
              language: 'kql',
              query: layer.filter ?? '',
            },
          })),
          options: {
            breakdown: { type: 'top_values', params: { size: 10 }, field: breakdown! },
          },
        });

        return new PieChart({
          layers: [pieLayer],
          formulaAPI: formula.formula,
          dataView: dataView,
        });
      case 'heatmap':
        const heatmapLayer = new HeatmapLayer({
          data: {
            value: layer.formula,
            label: layer.label,
            format: layer.format,
            filter: {
              language: 'kql',
              query: layer.filter ?? '',
            },
          },
          options: {
            breakdown_x: { type: 'top_values', params: { size: 10 }, field: breakdown_x! },
            breakdown_y: { type: 'top_values', params: { size: 10 }, field: breakdown! },
          },
        });

        return new HeatmapChart({
          layers: heatmapLayer,
          formulaAPI: formula.formula,
          dataView: dataView,
        });
    }
  };

  const visualization = createVisualization();

  const attributes = new LensAttributesBuilder({
    visualization,
  }).build();

  const lensEmbeddableInput: Assign<LensEmbeddableInput, { attributes: typeof attributes }> = {
    id: indexPattern,
    attributes,
    timeRange: {
      from: start,
      to: end,
      mode: 'relative' as const,
    },
  };

  return lensEmbeddableInput;

}
