/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// /*
//  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
//  * or more contributor license agreements. Licensed under the Elastic License;
//  * you may not use this file except in compliance with the Elastic License.
//  */

// import React, { useState, useRef, useEffect } from 'react';
// import uuid from 'uuid';
// import { FeatureCollection } from 'geojson';
// import {
//   ErrorEmbeddable,
//   ViewMode,
//   isErrorEmbeddable,
// } from '../../../../../../../../../src/plugins/embeddable/public';
// import {
//   MapEmbeddable,
//   MapEmbeddableInput,
//   // eslint-disable-next-line @kbn/eslint/no-restricted-paths
// } from '../../../../../../maps/public/embeddable';
// import { useMlKibana } from '../../../../contexts/kibana';
// import { MAP_SAVED_OBJECT_TYPE, SOURCE_TYPES } from '../../../../../../../maps/common/constants';
// import { LayerDescriptor } from '../../../../../../../maps/common/descriptor_types';
// import { RenderTooltipContentParams } from '../../../../../../../maps/public';
// import { MapToolTip } from './ml_embedded_map_tooltip';
// export const getGeoPointsLayer = (
//   geoPoints: Array<{ lon: number; lat: number }>,
//   pointColor: string
// ) => {
//   const features: FeatureCollection = geoPoints?.map((point, idx) => ({
//     type: 'feature',
//     id: `geo_points-${idx}`,
//     geometry: {
//       type: 'Point',
//       coordinates: [+point.lon, +point.lat],
//     },
//   }));
//   return {
//     id: 'geo_points',
//     label: 'Geo points',
//     sourceDescriptor: {
//       type: SOURCE_TYPES.GEOJSON_FILE,
//       __featureCollection: {
//         features,
//         type: 'FeatureCollection',
//       },
//     },
//     visible: true,
//     style: {
//       type: 'VECTOR',
//       properties: {
//         fillColor: {
//           type: 'STATIC',
//           options: {
//             color: pointColor,
//           },
//         },
//         lineColor: {
//           type: 'STATIC',
//           options: {
//             color: '#fff',
//           },
//         },
//         lineWidth: {
//           type: 'STATIC',
//           options: {
//             size: 2,
//           },
//         },
//         iconSize: {
//           type: 'STATIC',
//           options: {
//             size: 6,
//           },
//         },
//       },
//     },
//     type: 'VECTOR',
//   };
// };

// export function EmbeddedMapComponent({ config }) {
//   const [embeddable, setEmbeddable] = useState<MapEmbeddable | ErrorEmbeddable | undefined>();

//   const embeddableRoot: React.RefObject<HTMLDivElement> = useRef<HTMLDivElement>(null);
//   const layerList = useRef<LayerDescriptor[]>([]);

//   const {
//     services: { embeddable: embeddablePlugin, maps: mapsPlugin },
//   } = useMlKibana();

//   if (!embeddablePlugin) {
//     throw new Error('Embeddable start plugin not found');
//   }
//   if (!mapsPlugin) {
//     throw new Error('Maps start plugin not found');
//   }

//   const factory: any = embeddablePlugin.getEmbeddableFactory(MAP_SAVED_OBJECT_TYPE);

//   const input: MapEmbeddableInput = {
//     id: uuid.v4(),
//     attributes: { title: '' },
//     filters: [],
//     hidePanelTitles: true,
//     refreshConfig: {
//       value: 0,
//       pause: false,
//     },
//     viewMode: ViewMode.VIEW,
//     isLayerTOCOpen: false,
//     hideFilterActions: true,
//     // Zoom Lat/Lon values are set to make sure map is in center in the panel
//     // It wil also omit Greenland/Antarctica etc
//     mapCenter: {
//       lon: 11,
//       lat: 20,
//       zoom: 0,
//     },
//     disableInteractive: false,
//     hideToolbarOverlay: true,
//     hideLayerControl: true,
//     hideViewControl: false,
//   };

//   const renderTooltipContent = ({
//     closeTooltip,
//     features,
//     loadFeatureProperties,
//   }): RenderTooltipContentParams => {
//     return (
//       <MapToolTip
//         closeTooltip={closeTooltip}
//         features={features}
//         loadFeatureProperties={loadFeatureProperties}
//       />
//     );
//   };

//   // Update the layer list  with updated geo points upon refresh
//   useEffect(() => {
//     if (embeddable && !isErrorEmbeddable(embeddable) && Array.isArray(config?.stats?.examples)) {
//       layerList.current = [...layerList.current, getGeoPointsLayer(config.stats.examples!, 'red')];
//       embeddable.setLayerList(layerList.current);
//     }
//   }, [embeddable, config]);

//   useEffect(() => {
//     async function setupEmbeddable() {
//       if (!factory) {
//         throw new Error('Map embeddable not found.');
//       }
//       const embeddableObject: any = await factory.create({
//         ...input,
//         title: 'Data visualizer map',
//       });

//       if (embeddableObject && !isErrorEmbeddable(embeddableObject)) {
//         embeddableObject.setRenderTooltipContent(renderTooltipContent);
//         const basemapLayerDescriptor = mapsPlugin
//           ? await mapsPlugin.createLayerDescriptors.createBasemapLayerDescriptor()
//           : null;

//         if (basemapLayerDescriptor) {
//           layerList.current = [basemapLayerDescriptor];
//           await embeddableObject.setLayerList(layerList.current);
//         }
//       }

//       setEmbeddable(embeddableObject);
//     }

//     setupEmbeddable();

//     // we want this effect to execute exactly once after the component mounts
//   }, []);

//   // We can only render after embeddable has already initialized
//   useEffect(() => {
//     if (embeddableRoot.current && embeddable) {
//       embeddable.render(embeddableRoot.current);
//     }
//   }, [embeddable, embeddableRoot]);

//   return (
//     <div
//       className={'mlFieldDataCard__geoContent'}
//       style={{
//         width: '100%',
//         height: 300,
//       }}
//     >
//       <div
//         data-test-subj="xpack.ml.datavisualizer.embeddedMapPanel"
//         className="embPanel__content"
//         ref={embeddableRoot}
//         style={{
//           width: '100%',
//           height: '100%',
//           display: 'flex',
//           flex: '1 1 100%',
//           zIndex: 1,
//           minHeight: 0, // Absolute must for Firefox to scroll contents
//         }}
//       />
//     </div>
//   );
// }
