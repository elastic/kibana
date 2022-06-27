import { IconType } from "@elastic/eui";

export interface ActionProps {
  iconType?: IconType | string;
  label: string;
  onClick?: any;
  color?: any;
}

export interface MetaDataProps {
  id: string;
  lastUpdated: string;
  engineId: string;
  clickCount: number;
}

export interface ResultFieldProps {
  iconType: IconType;
  fieldName: string;
  fieldValue: string;
}
