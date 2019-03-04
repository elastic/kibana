/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export getCapabilitesResponse = `
  <?xml version="1.0" encoding="UTF-8"?>
  <WMT_MS_Capabilities version="1.1.1">
    <Service>
      <Name><![CDATA[NDFD_temp]]></Name>
      <Title><![CDATA[NDFD Temperatures]]></Title>
      <Abstract><![CDATA[Max and min t, Relative humitity and temperature forecasts]]></Abstract>
      <KeywordList><Keyword><![CDATA[NDFD, Temperature, grids]]></Keyword></KeywordList>
      <OnlineResource xmlns:xlink="http://www.w3.org/1999/xlink" xlink:type="simple" xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?"/>
      <ContactInformation>
        <ContactPersonPrimary>
          <ContactPerson><![CDATA[]]></ContactPerson>
          <ContactOrganization><![CDATA[]]></ContactOrganization>
        </ContactPersonPrimary>
        <ContactPosition><![CDATA[]]></ContactPosition>
        <ContactAddress>
          <AddressType><![CDATA[]]></AddressType>
          <Address><![CDATA[]]></Address>
          <City><![CDATA[]]></City>
          <StateOrProvince><![CDATA[]]></StateOrProvince>
          <PostCode><![CDATA[]]></PostCode>
          <Country><![CDATA[]]></Country>
        </ContactAddress>
        <ContactVoiceTelephone><![CDATA[]]></ContactVoiceTelephone>
        <ContactFacsimileTelephone><![CDATA[]]></ContactFacsimileTelephone>
        <ContactElectronicMailAddress><![CDATA[]]></ContactElectronicMailAddress>
      </ContactInformation>
      <Fees><![CDATA[]]></Fees>
      <AccessConstraints><![CDATA[]]></AccessConstraints>
    </Service>
    <Capability>
      <Request>
        <GetCapabilities>
          <Format>application/vnd.ogc.wms_xml</Format>
          <DCPType>
            <HTTP><Get><OnlineResource xmlns:xlink="http://www.w3.org/1999/xlink" xlink:type="simple" xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?"/></Get></HTTP>
          </DCPType>
        </GetCapabilities>
        <GetMap>
          <Format>image/bmp</Format>
          <Format>image/jpeg</Format>
          <Format>image/tiff</Format>
          <Format>image/png</Format>
          <Format>image/png8</Format>
          <Format>image/png24</Format>
          <Format>image/png32</Format>
          <Format>image/gif</Format>
          <Format>image/svg+xml</Format>
          <DCPType>
            <HTTP><Get><OnlineResource xmlns:xlink="http://www.w3.org/1999/xlink" xlink:type="simple" xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?"/></Get></HTTP>
          </DCPType>
        </GetMap>
        <GetFeatureInfo>
          <Format>application/vnd.esri.wms_raw_xml</Format>
          <Format>application/vnd.esri.wms_featureinfo_xml</Format>
          <Format>application/vnd.ogc.wms_xml</Format>
          <Format>application/geojson</Format>
          <Format>text/xml</Format>
          <Format>text/html</Format>
          <Format>text/plain</Format>
          <DCPType>
            <HTTP><Get><OnlineResource xmlns:xlink="http://www.w3.org/1999/xlink" xlink:type="simple" xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?"/></Get></HTTP>
          </DCPType>
        </GetFeatureInfo>
        <GetStyles>
          <Format>application/vnd.ogc.sld+xml</Format>
          <DCPType>
            <HTTP><Get><OnlineResource xmlns:xlink="http://www.w3.org/1999/xlink" xlink:type="simple" xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?"/></Get></HTTP>
          </DCPType>
        </GetStyles>
      </Request>
      <Exception>
        <Format>application/vnd.ogc.se_xml</Format>
        <Format>application/vnd.ogc.se_inimage</Format>
        <Format>application/vnd.ogc.se_blank</Format>
      </Exception>
      <Layer>
        <Title><![CDATA[National Digital Forecast Database (NDFD) Temperatures]]></Title>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179395" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179395" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179395" maxx="-60.866438" maxy="52.838599"/>
        <Layer queryable="1">
          <Title><![CDATA[MinTempF_2Day]]></Title>
          <Abstract><![CDATA[Low temperature in degree farenheit for days 1 through 2.  ]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Title><![CDATA[MinTemp_Day2]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>2</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_MinT]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>2</Title>
            <LegendURL width="94" height="3232">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=2" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>3</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>3</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=3" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>4</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>4</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=4" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[MinTemp_Day1]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>6</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_MinT]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>6</Title>
            <LegendURL width="94" height="3232">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=6" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>7</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>7</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=7" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>8</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>8</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=8" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[MaxTempF_3Day]]></Title>
          <Abstract><![CDATA[High temperature in degree farenheit for days 1 through 3.  ]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Title><![CDATA[MaxTemp_Day3]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>11</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_MaxT]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>11</Title>
            <LegendURL width="94" height="3232">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=11" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>12</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>12</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=12" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>13</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>13</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=13" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[MaxTemp_Day2]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>15</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_MaxT]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>15</Title>
            <LegendURL width="94" height="3232">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=15" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>16</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>16</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=16" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>17</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>17</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=17" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[MaxTemp_Day1]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>19</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_MaxT]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>19</Title>
            <LegendURL width="94" height="3232">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=19" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>20</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>20</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=20" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>21</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>21</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=21" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[RHPct_24Hr]]></Title>
          <Abstract><![CDATA[Temperature in degree farenheit in three hour forecast intervals.  ]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Title><![CDATA[RH_Pct_24Hr]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>24</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_Rhm]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>24</Title>
            <LegendURL width="124" height="3232">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=24" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>25</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>25</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=25" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>26</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>26</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=26" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[RH_Pct_21Hr]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>28</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_Rhm]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>28</Title>
            <LegendURL width="124" height="3232">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=28" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>29</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>29</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=29" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>30</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>30</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=30" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[RH_Pct_18Hr]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>32</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_Rhm]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>32</Title>
            <LegendURL width="124" height="3232">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=32" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>33</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>33</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=33" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>34</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>34</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=34" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[RH_Pct_15Hr]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>36</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_Rhm]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>36</Title>
            <LegendURL width="124" height="3232">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=36" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>37</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>37</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=37" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>38</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>38</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=38" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[RH_Pct_12Hr]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>40</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_Rhm]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>40</Title>
            <LegendURL width="124" height="3232">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=40" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>41</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>41</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=41" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>42</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>42</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=42" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[RH_Pct_09Hr]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>44</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_Rhm]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>44</Title>
            <LegendURL width="124" height="3232">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=44" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>45</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>45</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=45" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>46</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>46</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=46" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[RH_Pct_06Hr]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>48</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_Rhm]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>48</Title>
            <LegendURL width="124" height="3232">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=48" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>49</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>49</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=49" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>50</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>50</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=50" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[RH_Pct_03Hr]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>52</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_Rhm]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>52</Title>
            <LegendURL width="124" height="3232">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=52" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>53</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>53</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=53" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>54</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>54</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=54" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[RH_Pct_00Hr]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>56</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_Rhm]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>56</Title>
            <LegendURL width="124" height="3232">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=56" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>57</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>57</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=57" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>58</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>58</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=58" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[RH_0_to_24Hr]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <Dimension name="time" units="ISO8601" current="1"/>
  <Extent name="time" default="2019-03-04T16:00:00.000Z">2019-03-04T16:00:00.000Z/2019-03-05T16:59:59.000Z/</Extent>
        <Layer queryable="1">
          <Name>60</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_Rhm]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>60</Title>
            <LegendURL width="124" height="3232">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=60" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>61</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <Dimension name="time" units="ISO8601" current="1"/>
  <Extent name="time" default="2019-03-04T16:00:00.000Z">2019-03-04T16:00:00.000Z/2019-03-05T16:59:59.000Z/</Extent>
          <Style>
            <Name>default</Name>
            <Title>61</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=61" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>62</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>62</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=62" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[AptTempF_24Hr]]></Title>
          <Abstract><![CDATA[Temperature in degree farenheit in three hour forecast intervals.  ]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Title><![CDATA[AptTemp_24Hr]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>65</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_Apt]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>65</Title>
            <LegendURL width="124" height="2256">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=65" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>66</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>66</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=66" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>67</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>67</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=67" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[AptTemp_21Hr]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>69</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_Apt]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>69</Title>
            <LegendURL width="124" height="2256">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=69" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>70</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>70</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=70" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>71</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>71</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=71" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[AptTemp_18Hr]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>73</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_Apt]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>73</Title>
            <LegendURL width="124" height="2256">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=73" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>74</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>74</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=74" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>75</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>75</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=75" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[AptTemp_15Hr]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>77</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_Apt]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>77</Title>
            <LegendURL width="124" height="2256">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=77" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>78</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>78</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=78" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>79</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>79</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=79" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[AptTemp_09Hr]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>81</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_Apt]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>81</Title>
            <LegendURL width="124" height="2256">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=81" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>82</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>82</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=82" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>83</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>83</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=83" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[AptTemp_12Hr]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>85</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_Apt]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>85</Title>
            <LegendURL width="124" height="2256">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=85" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>86</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>86</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=86" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>87</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>87</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=87" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[AptTemp_06Hr]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>89</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_Apt]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>89</Title>
            <LegendURL width="124" height="2256">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=89" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>90</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>90</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=90" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>91</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>91</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=91" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[AptTemp_03Hr]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>93</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_Apt]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>93</Title>
            <LegendURL width="124" height="2256">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=93" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>94</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>94</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=94" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>95</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>95</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=95" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[AptTemp_00Hr]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>97</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_Apt]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>97</Title>
            <LegendURL width="124" height="2256">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=97" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>98</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>98</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=98" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>99</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>99</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=99" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[Apt_0_to_24hr]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <Dimension name="time" units="ISO8601" current="1"/>
  <Extent name="time" default="2019-03-04T16:00:00.000Z">2019-03-04T16:00:00.000Z/2019-03-05T16:59:59.000Z/</Extent>
        <Layer queryable="1">
          <Name>101</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_Apt]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>101</Title>
            <LegendURL width="124" height="2256">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=101" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>102</Name>
          <Title><![CDATA[Footprint]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <Dimension name="time" units="ISO8601" current="1"/>
  <Extent name="time" default="2019-03-04T16:00:00.000Z">2019-03-04T16:00:00.000Z/2019-03-05T16:59:59.000Z/</Extent>
          <Style>
            <Name>default</Name>
            <Title>102</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=102" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>103</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>103</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=103" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[TempF_24Hr]]></Title>
          <Abstract><![CDATA[Temperature in degree farenheit in three hour forecast intervals.  ]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Title><![CDATA[Temp_24Hr]]></Title>
          <Abstract><![CDATA[Temperature in degrees F at forecast hour 24. ]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>106</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_MaxT]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>106</Title>
            <LegendURL width="124" height="2256">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=106" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>107</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>107</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=107" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>108</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>108</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=108" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[Temp_21Hr]]></Title>
          <Abstract><![CDATA[Temperature in degrees F at forecast hour 21. ]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>110</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_MaxT]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>110</Title>
            <LegendURL width="124" height="2256">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=110" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>111</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>111</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=111" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>112</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>112</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=112" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[Temp_18Hr]]></Title>
          <Abstract><![CDATA[Temperature in degrees F at forecast hour 18. ]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>114</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_MaxT]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>114</Title>
            <LegendURL width="124" height="2256">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=114" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>115</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>115</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=115" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>116</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>116</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=116" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[Temp_15Hr]]></Title>
          <Abstract><![CDATA[Temperature in degrees F at forecast hour 15. ]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>118</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_MaxT]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>118</Title>
            <LegendURL width="124" height="2256">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=118" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>119</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>119</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=119" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>120</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>120</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=120" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[Temp_12Hr]]></Title>
          <Abstract><![CDATA[Temperature in degrees F at forecast hour 12. ]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>122</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_MaxT]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>122</Title>
            <LegendURL width="124" height="2256">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=122" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>123</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>123</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=123" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>124</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>124</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=124" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[Temp_09Hr]]></Title>
          <Abstract><![CDATA[Temperature in degrees F at forecast hour 00. ]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>126</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_MaxT]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>126</Title>
            <LegendURL width="124" height="2256">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=126" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>127</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>127</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=127" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>128</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>128</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=128" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[Temp_06Hr]]></Title>
          <Abstract><![CDATA[Temperature in degrees F at forecast hour 00. ]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>130</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_MaxT]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>130</Title>
            <LegendURL width="124" height="2256">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=130" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>131</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>131</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=131" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>132</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>132</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=132" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[Temp_03Hr]]></Title>
          <Abstract><![CDATA[Temperature in degrees F at forecast hour 00. ]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>134</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_MaxT]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>134</Title>
            <LegendURL width="124" height="2256">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=134" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>135</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>135</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=135" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>136</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>136</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=136" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[Temp_00Hr]]></Title>
          <Abstract><![CDATA[Temperature in degrees F at forecast hour 00. ]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
        <Layer queryable="1">
          <Name>138</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_MaxT]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>138</Title>
            <LegendURL width="124" height="2256">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=138" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>139</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>139</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=139" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>140</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>140</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=140" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        <Layer queryable="1">
          <Title><![CDATA[Temp_0_to_24hr]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <Dimension name="time" units="ISO8601" current="1"/>
  <Extent name="time" default="2019-03-04T14:00:00.000Z">2019-03-04T14:00:00.000Z/2019-03-05T16:59:59.000Z/</Extent>
        <Layer queryable="1">
          <Name>142</Name>
          <Title><![CDATA[Image]]></Title>
          <Abstract><![CDATA[nws_ndfd_Temp]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116038" miny="20.179399" maxx="-60.866438" maxy="52.838599"/>
          <Style>
            <Name>default</Name>
            <Title>142</Title>
            <LegendURL width="124" height="2256">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=142" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>143</Name>
          <Title><![CDATA[Label]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <Dimension name="time" units="ISO8601" current="1"/>
  <Extent name="time" default="2019-03-04T14:00:00.000Z">2019-03-04T14:00:00.000Z/2019-03-05T16:59:59.000Z/</Extent>
          <Style>
            <Name>default</Name>
            <Title>143</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=143" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        <Layer queryable="1">
          <Name>144</Name>
          <Title><![CDATA[Boundary]]></Title>
          <Abstract><![CDATA[]]></Abstract>
  <SRS>EPSG:4326</SRS>
  <SRS>EPSG:4269</SRS>
  <LatLonBoundingBox minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4326" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
  <BoundingBox SRS="EPSG:4269" minx="-130.116025" miny="20.179395" maxx="-60.866440" maxy="52.838594"/>
          <Style>
            <Name>default</Name>
            <Title>144</Title>
            <LegendURL width="16" height="16">
              <Format>image/png</Format>
              <OnlineResource xlink:href="http://idpgis.ncep.noaa.gov/arcgis/services/NWS_Forecasts_Guidance_Warnings/NDFD_temp/MapServer/WmsServer?request=GetLegendGraphic%26version=1.1.1%26format=image/png%26layer=144" xlink:type="simple" xmlns:xlink="http://www.w3.org/1999/xlink" />
            </LegendURL>
          </Style>
        </Layer>
        </Layer>
        </Layer>
      </Layer>
    </Capability>
  </WMT_MS_Capabilities>`;
