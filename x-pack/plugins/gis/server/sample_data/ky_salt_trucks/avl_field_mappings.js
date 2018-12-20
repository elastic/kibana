/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const avlFieldMappings = {
  "avlAddress": {
    "type": "keyword"
  },
  "avlAirTemp": {
    "type": "double"
  },
  "avlBlast": {
    "type": "byte"
  },
  "avlDirection": {
    "type": "short"
  },
  "avlDryRate": {
    "type": "double"
  },
  "avlLiquidRate": {
    "type": "double"
  },
  "avlPlowStatus": {
    "type": "byte"
  },
  "avlPoint": {
    "type": "geo_point"
  },
  "avlRoadTemp": {
    "type": "double"
  },
  "avlSecond": {
    "type": "byte"
  },
  "avlVehName": {
    "type": "keyword"
  },
  "avlVehType": {
    "type": "keyword"
  },
  "avlVelocity": {
    "type": "byte"
  },
  "kytcADTLastCnt": {
    "type": "double"
  },
  "kytcADTLastCntYr": {
    "type": "double"
  },
  "kytcCityTxt": {
    "type": "keyword"
  },
  "kytcCountyName": {
    "type": "keyword"
  },
  "kytcCountyNmbr": {
    "type": "double"
  },
  "kytcDataCaptureTimeUTC": {
    "type": "date"
  },
  "kytcDateExistsET": {
    "type": "date"
  },
  "kytcDateExistsUTC": {
    "type": "date"
  },
  "kytcDayET": {
    "type": "byte"
  },
  "kytcDistrict": {
    "type": "double"
  },
  "kytcDryRateCalc": {
    "type": "double"
  },
  "kytcDryRateCalcCost": {
    "type": "double"
  },
  "kytcFunctionalClass": {
    "type": "keyword"
  },
  "kytcGovLevelTxt": {
    "type": "keyword"
  },
  "kytcHourET": {
    "type": "byte"
  },
  "kytcLiquidRateCalc": {
    "type": "double"
  },
  "kytcLiquidRateCalcCost": {
    "type": "double"
  },
  "kytcMPInitial": {
    "type": "double"
  },
  "kytcMinuteET": {
    "type": "byte"
  },
  "kytcMonthET": {
    "type": "byte"
  },
  "kytcRdName": {
    "fields": {
      "kw": {
        "type": "keyword"
      }
    },
    "type": "text"
  },
  "kytcRoadID": {
    "type": "double"
  },
  "kytcRoute": {
    "type": "keyword"
  },
  "kytcRouteLbl": {
    "type": "keyword"
  },
  "kytcRouteType": {
    "type": "keyword"
  },
  "kytcRtNumber": {
    "type": "double"
  },
  "kytcRtPrefix": {
    "type": "keyword"
  },
  "kytcRtSection": {
    "type": "double"
  },
  "kytcRtSuffix": {
    "type": "keyword"
  },
  "kytcRtUniqueInitial": {
    "type": "keyword"
  },
  "kytcSnapDistanceOnLine": {
    "type": "double"
  },
  "kytcSnapDistanceToLine": {
    "type": "double"
  },
  "kytcSnapHeadingRadians": {
    "type": "double"
  },
  "kytcSnapPercentAlong": {
    "type": "double"
  },
  "kytcSnapPoint": {
    "type": "geo_point"
  },
  "kytcSnapProbability": {
    "type": "double"
  },
  "kytcSnapStatus": {
    "type": "keyword"
  },
  "kytcSnapped10": {
    "type": "keyword"
  },
  "kytcSnapped1000": {
    "type": "keyword"
  },
  "kytcSnapped25": {
    "type": "keyword"
  },
  "kytcSnapped50": {
    "type": "keyword"
  },
  "kytcSnapped500": {
    "type": "keyword"
  },
  "kytcSnwIcePriority": {
    "type": "keyword"
  },
  "kytcTypeOp": {
    "type": "keyword"
  },
  "kytcWeekDayTxtET": {
    "type": "keyword"
  },
  "kytcYearDayET": {
    "type": "short"
  },
  "kytcYearET": {
    "type": "short"
  }
};
