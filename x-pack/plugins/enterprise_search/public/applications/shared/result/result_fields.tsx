import React from 'react';
import { ResultField } from './result_field';
import { ResultFieldProps } from './types';

interface Props {
  fields: ResultFieldProps[];
}

export const ResultFields: React.FC<Props> = ({
  fields
}) => {
  return (
    <div className="resultFieldList">
      {fields.map((field) => (
        <ResultField
          iconType={field.iconType}
          fieldName={field.fieldName}
          fieldValue={field.fieldValue}
        />
      ))}
    </div>
  )
}
