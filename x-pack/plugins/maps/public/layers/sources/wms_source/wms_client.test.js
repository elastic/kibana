/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { WmsClient } from './wms_client';

describe('getCapabilities', () => {
  it('Should extract flat Layer elements', async () => {
    const wmsClient = new WmsClient({ serviceUrl: 'myWMSUrl' });
    wmsClient._fetch = () => {
      return {
        status: 200,
        text: () => {
          return `
            <WMT_MS_Capabilities version="1.1.1">
              <Capability>
                <Layer>
                  <Title>layer1</Title>
                  <Name>1</Name>
                  <Style>
                    <Name>default</Name>
                    <Title>defaultStyle</Title>
                  </Style>
                </Layer>
                <Layer>
                  <Title>layer2</Title>
                  <Name>2</Name>
                  <Style>
                    <Name>fancy</Name>
                    <Title>fancyStyle</Title>
                  </Style>
                </Layer>
              </Capability>
            </WMT_MS_Capabilities>
          `;
        },
      };
    };
    const capabilities = await wmsClient.getCapabilities();
    expect(capabilities.layers).toEqual([
      { label: 'layer1 (1)', value: '1' },
      { label: 'layer2 (2)', value: '2' },
    ]);
    expect(capabilities.styles).toEqual([
      { label: 'defaultStyle (default)', value: 'default' },
      { label: 'fancyStyle (fancy)', value: 'fancy' },
    ]);
  });

  // Good example of Layer hierarchy in the wild can be found at
  // https://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WMSServer
  it('Should extract hierarchical Layer elements', async () => {
    const wmsClient = new WmsClient({ serviceUrl: 'myWMSUrl' });
    wmsClient._fetch = () => {
      return {
        status: 200,
        text: () => {
          return `
            <WMT_MS_Capabilities version="1.1.1">
              <Capability>
                <Layer>
                  <Title><![CDATA[hierarchyLevel1PathA]]></Title>
                  <Layer>
                    <Title>hierarchyLevel2</Title>
                    <Layer>
                      <Title>layer1</Title>
                      <Name>1</Name>
                      <Style>
                        <Name>default</Name>
                        <Title>defaultStyle</Title>
                      </Style>
                    </Layer>
                    <Layer>
                      <Title>layer2</Title>
                      <Name>2</Name>
                    </Layer>
                  </Layer>
                </Layer>
                <Layer>
                  <Title>hierarchyLevel1PathB</Title>
                  <Layer>
                    <Title>layer3</Title>
                    <Name>3</Name>
                    <Style>
                      <Name>fancy</Name>
                      <Title>fancyStyle</Title>
                    </Style>
                  </Layer>
                </Layer>
              </Capability>
            </WMT_MS_Capabilities>
          `;
        },
      };
    };
    const capabilities = await wmsClient.getCapabilities();
    expect(capabilities.layers).toEqual([
      { label: 'hierarchyLevel1PathA - hierarchyLevel2 - layer1 (1)', value: '1' },
      { label: 'hierarchyLevel1PathA - hierarchyLevel2 - layer2 (2)', value: '2' },
      { label: 'hierarchyLevel1PathB - layer3 (3)', value: '3' },
    ]);
    expect(capabilities.styles).toEqual([
      {
        label: 'hierarchyLevel1PathA - hierarchyLevel2 - defaultStyle (default)',
        value: 'default',
      },
      { label: 'hierarchyLevel1PathB - fancyStyle (fancy)', value: 'fancy' },
    ]);
  });

  it('Should create group from common parts of Layer hierarchy', async () => {
    const wmsClient = new WmsClient({ serviceUrl: 'myWMSUrl' });
    wmsClient._fetch = () => {
      return {
        status: 200,
        text: () => {
          return `
            <WMT_MS_Capabilities version="1.1.1">
              <Capability>
                <Layer>
                  <Title>hierarchyLevel1PathA</Title>
                  <Layer>
                    <Title>hierarchyLevel2</Title>
                    <Layer>
                      <Title>layer1</Title>
                      <Name>1</Name>
                      <Style>
                        <Name>default</Name>
                        <Title>defaultStyle</Title>
                      </Style>
                    </Layer>
                  </Layer>
                </Layer>
                <Layer>
                  <Title>hierarchyLevel1PathA</Title>
                  <Layer>
                    <Title>hierarchyLevel2</Title>
                    <Layer>
                      <Title>layer2</Title>
                      <Name>2</Name>
                      <Style>
                        <Name>fancy</Name>
                        <Title>fancyStyle</Title>
                      </Style>
                    </Layer>
                  </Layer>
                </Layer>
              </Capability>
            </WMT_MS_Capabilities>
          `;
        },
      };
    };
    const capabilities = await wmsClient.getCapabilities();
    expect(capabilities.layers).toEqual([
      {
        label: 'hierarchyLevel1PathA - hierarchyLevel2',
        options: [
          { label: 'layer1 (1)', value: '1' },
          { label: 'layer2 (2)', value: '2' },
        ],
      },
    ]);
    expect(capabilities.styles).toEqual([
      {
        label: 'hierarchyLevel1PathA - hierarchyLevel2',
        options: [
          { label: 'defaultStyle (default)', value: 'default' },
          { label: 'fancyStyle (fancy)', value: 'fancy' },
        ],
      },
    ]);
  });

  it('Should ensure no option labels have name collisions', async () => {
    const wmsClient = new WmsClient({ serviceUrl: 'myWMSUrl' });
    wmsClient._fetch = () => {
      return {
        status: 200,
        text: () => {
          return `
            <WMT_MS_Capabilities version="1.1.1">
              <Capability>
                <Layer>
                  <Title>mylayer</Title>
                  <Name>my_layer</Name>
                  <Style>
                    <Name>default</Name>
                    <Title>defaultStyle</Title>
                  </Style>
                </Layer>
                <Layer>
                  <Title>mylayer</Title>
                  <Name>my_layer</Name>
                  <Style>
                    <Name>default</Name>
                    <Title>defaultStyle</Title>
                  </Style>
                </Layer>
                <Layer>
                  <Title>mylayer</Title>
                  <Name>my_layer</Name>
                  <Style>
                    <Name>default</Name>
                    <Title>defaultStyle</Title>
                  </Style>
                </Layer>
              </Capability>
            </WMT_MS_Capabilities>
          `;
        },
      };
    };
    const capabilities = await wmsClient.getCapabilities();
    expect(capabilities.layers).toEqual([
      { label: 'mylayer (my_layer)', value: 'my_layer' },
      { label: 'mylayer (my_layer):1', value: 'my_layer' },
      { label: 'mylayer (my_layer):2', value: 'my_layer' },
    ]);
  });

  it('Should not create group common hierarchy when there is only a single layer', async () => {
    const wmsClient = new WmsClient({ serviceUrl: 'myWMSUrl' });
    wmsClient._fetch = () => {
      return {
        status: 200,
        text: () => {
          return `
            <WMT_MS_Capabilities version="1.1.1">
              <Capability>
                <Layer>
                  <Title>layer1</Title>
                  <Name>1</Name>
                </Layer>
              </Capability>
            </WMT_MS_Capabilities>
          `;
        },
      };
    };
    const capabilities = await wmsClient.getCapabilities();
    expect(capabilities.layers).toEqual([{ label: 'layer1 (1)', value: '1' }]);
  });
});

describe('getUrlTemplate', () => {
  it('Should not overwrite specific query parameters when defined in the url', async () => {
    const urlWithQuery =
      'http://example.com/wms?map=MyMap&format=image/jpeg&service=NotWMS&version=0&request=GetNull&srs=Invalid&transparent=false&width=1024&height=640';
    const wmsClient = new WmsClient({ serviceUrl: urlWithQuery });
    const urlTemplate = await wmsClient.getUrlTemplate('MyLayer', 'MyStyle');
    expect(urlTemplate).toEqual(
      'http://example.com/wms?map=MyMap&format=image%2Fpng&service=WMS&version=1.1.1&request=GetMap&srs=EPSG%3A3857&transparent=true&width=256&height=256&layers=MyLayer&styles=MyStyle&bbox={bbox-epsg-3857}'
    );
  });
});
