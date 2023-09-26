import useAsync from "react-use/lib/useAsync";
import {LensAttributesBuilder, XYChart, XYDataLayer} from "@kbn/lens-embeddable-utils";
import {Assign} from "utility-types";
import {LensEmbeddableInput, LensPublicStart} from "@kbn/lens-plugin/public";


export const getLensConfig = async (lens: LensPublicStart, dataViews, { indexPattern, timeField, start, end, layers, seriesType, breakdown }) => {

  const xyDataLayer = new XYDataLayer({
    data: layers.map((layer) => ({
      type: 'formula',
      value: layer.formula,
      label: layer.label,
      format: layer.format,
      filter: {
        language: 'kql',
        query: layer.filter ?? '',
      },
    })),
    options: {
      seriesType,
      breakdown: breakdown
        ? { type: 'top_values', params: { size: 10 }, field: breakdown.field }
        : undefined,
    },
  });

  const formula = await lens.stateHelperApi();

  const dataView = await dataViews.create({
    id: indexPattern,
    title: indexPattern,
    timeFieldName: timeField,
  });

  const attributes = new LensAttributesBuilder({
    visualization: new XYChart({
      layers: [xyDataLayer],
      formulaAPI: formula.formula,
      dataView,
    }),
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
