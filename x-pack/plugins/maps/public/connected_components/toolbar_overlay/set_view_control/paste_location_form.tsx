
import React, { ChangeEvent, Component, Fragment } from 'react';
import { EuiButton, EuiFieldText, EuiFormRow, EuiSpacer, EuiTextAlign } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { MapCenter } from '../../../../common/descriptor_types';

import { mgrsToDD, withinRange } from './utils';

const LOCATION_PATTERNS:any = {
    dd: /^\s*?(-?\d{1,2}(?:\.\d+)?)\s*[,\s|]\s*(-?\d{1,3}(?:\.\d+)?)(?:\b|\D)$/g,
    dms:/(^\d{1,6}(?:N|S))\s*[,\s|]\s*(\d{1,7}(?:E|W))/gi,
    wkt:/^(?:\s?|\s+)point\s*\((-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)\)/gi,
    mgrs:/^\d{1,2}\s?[^ABIOYZabioyz]\s?[A-Za-z]{2}\s?(?:[0-9]\s?[0-9]\s?)+$/,
    json:/\{(?:\s+)?".+"[.\S\s]*}/ //Very crude JSON test but should work
  }
  

  interface Props {
    onSubmit: (lat: number, lon: number) => void;
  }

  interface State {
    locationParsingError:string;
    location: string ;
    isLocationInvalid: boolean | undefined;
    center: MapCenter 
  }

  export class PasteLocationForm extends Component<Props, State> {
    state: State = {
        locationParsingError: "",
        location: "",
        isLocationInvalid: undefined,
        center: {
            lat: 0,
            lon: 0
        }
    };
    _onCenterChange = (center:MapCenter)=>{
        this.setState({center})
      }
    _onLocationChange = (evt: ChangeEvent<HTMLInputElement>) =>{

        let loc_string = evt.target.value
        let locationParsingError = "Location doesn't match DD,DMS,WKT,GEOJSON patterns"
        let matched:boolean|string = false
        for(let locationType in LOCATION_PATTERNS){
          let pattern = LOCATION_PATTERNS[locationType];
          let matches = loc_string.match(pattern);
          if(matches?.length){
            matched = locationType
          }
        }
        
        if(matched){
          //parse the location and set the center
          let center = {} as MapCenter;
          let pattern,matches;
          switch (matched) {
            case "mgrs":
              let loc = mgrsToDD(loc_string)
              center.lat = (loc.north +loc.south)/2
              center.lon = (loc.west+loc.east)/2
              break;
            case "wkt"://point(23 23)
                pattern = LOCATION_PATTERNS[matched]
                matches = pattern.exec(loc_string)
                pattern.lastIndex = 0 //reset regex object for reuse
                if(matches){
                  center.lat = parseFloat(matches[2])
                  center.lon = parseFloat(matches[1])
                }
                break
            case "dd": //123,123
              pattern = LOCATION_PATTERNS[matched]
              matches = pattern.exec(loc_string)
              pattern.lastIndex = 0 //reset regex object for reuse
              if(matches){
                center.lat = parseFloat(matches[1])
                center.lon = parseFloat(matches[2])
              }
              break
            case "dms"://350724N 950724W Oklahoma ish
              pattern = LOCATION_PATTERNS[matched]
              matches = pattern.exec(loc_string)
              pattern.lastIndex = 0 //reset regex object for reuse
              if(matches){
               var lat = matches[1]
               var lon = matches[2]
               lat = lat.padStart(7,"0")
               lon = lon.padStart(8,"0")
               let southing = lat[6].toUpperCase() ==="S";
               let westing = lon[7].toUpperCase() === "W"
               lat = lat.substr(0,6)
               lon = lon.substr(0,7)
               lat = parseInt(lat.substr(0,2))+parseInt(lat.substr(2,2))/60 + parseInt(lat.substr(4,2))/3600//degrees,minutes,seconds
               lon = parseInt(lon.substr(0,3))+parseInt(lon.substr(3,2))/60 + parseInt(lon.substr(5,2))/3600//degrees,minutes,seconds
               if(southing){
                 lat *= -1
               }
               if(westing){
                 lon *= -1
               }
               center.lat = lat
               center.lon = lon
              }
              break
            case "json":
              try {
                let json = JSON.parse(loc_string);           
                if(json.type === "Point"){//try geojson {"type": "Point","coordinates": [125.6, 10.1]}
                  center.lat = json.coordinates[1]
                  center.lon = json.coordinates[0]
                }else if(json.lat){//try legacy es point {lat:123,lon:456}
                  center.lat = json.lat
                  center.lon = json.lon
                }//TODO add an array with lat,lon?? even though it is already covered by DD
                //TODO should we handle a feature group with a point?
              } catch (error) {
                this.setState({isLocationInvalid:true,location:loc_string})
                return
              }
            default:
              break;
          }
          const { isInvalid: isLatInvalid, error: latError } = withinRange(center.lat, -90, 90);
          const { isInvalid: isLonInvalid, error: lonError } = withinRange(center.lon, -180, 180);
          if(!isLatInvalid && !isLonInvalid){
            this._onCenterChange(center)
          }else{
            matched = false;
            locationParsingError = latError || lonError || ""
          }
    
        }
        this.setState({locationParsingError,isLocationInvalid:!matched,location:evt.target.value})
      }

      render(): React.ReactNode {
          return (
              <Fragment>
            <EuiFormRow
            label={i18n.translate('xpack.maps.setViewControl.pasteLocation', {
              defaultMessage: 'Paste Location',
            })}
            isInvalid={this.state.isLocationInvalid}
            error={this.state.locationParsingError}
            display="columnCompressed"
          >
            <EuiFieldText
              compressed
              value={this.state.location}
              onChange={this._onLocationChange}
              isInvalid={this.state.isLocationInvalid}
              data-test-subj="pasteLocationInput"
            />
            
          </EuiFormRow>
          <EuiSpacer size="s" />
  
          <EuiTextAlign textAlign="right">
            <EuiButton
              size="s"
              fill
              disabled={this.state.isLocationInvalid}
              onClick={()=>{
                let {lat,lon} = this.state.center
                this.props.onSubmit(lat,lon)
              }}
              data-test-subj="submitViewButton"
            >
              <FormattedMessage
                id="xpack.maps.setViewControl.submitButtonLabel"
                defaultMessage="Go"
              />
            </EuiButton>
          </EuiTextAlign>
          </Fragment>
          )
      }
}