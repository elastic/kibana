/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonIcon,
  EuiFieldText,
  EuiFormRow,
  EuiIcon,
  EuiText,
  EuiBadge,
} from '@elastic/eui';

import type { NewAgentPolicy, AgentPolicy, GlobalDataTag } from '../../../../../../../common/types';

interface Props {
  updateAgentPolicy: (u: Partial<NewAgentPolicy | AgentPolicy>) => void;
  initialTags: GlobalDataTag[];
}

export const GlobalDataTagsTable: React.FC<Props> = ({ updateAgentPolicy, initialTags }) => {
  const [globalDataTags, setGlobalDataTags] = useState<GlobalDataTag[]>(initialTags);
  const [newTag, setNewTag] = useState<GlobalDataTag>({ name: '', value: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndices, setEditingIndices] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<
    Record<number, { name: string | null; value: string | null }>
  >({});
  const [newTagErrors, setNewTagErrors] = useState<{ name: string | null; value: string | null }>({
    name: null,
    value: null,
  });

  useEffect(() => {
    setGlobalDataTags(initialTags);
  }, [initialTags]);

  const handleAddField = () => {
    setIsAdding(true);
    setNewTag({ name: '', value: '' });
    setNewTagErrors({ name: null, value: null });
  };

  const validateTag = (tag: GlobalDataTag, index?: number) => {
    const trimmedName = tag.name.trim();
    const trimmedValue = tag.value.toString().trim();
    let nameError = null;
    let valueError = null;

    if (!trimmedName) {
      nameError = 'Name cannot be empty';
    } else if (/\s/.test(trimmedName)) {
      nameError = 'Name cannot contain spaces';
    } else if (globalDataTags.some((t, i) => i !== index && t.name === trimmedName)) {
      nameError = 'Name must be unique';
    }

    if (!trimmedValue) {
      valueError = 'Value cannot be empty';
    }

    return { nameError, valueError, isValid: !nameError && !valueError };
  };

  const handleConfirm = () => {
    const { nameError, valueError, isValid } = validateTag(newTag);

    if (!isValid) {
      setNewTagErrors({ name: nameError, value: valueError });
      return;
    }

    const updatedTags = [
      ...globalDataTags,
      { ...newTag, name: newTag.name.trim(), value: newTag.value.toString().trim() },
    ];
    setGlobalDataTags(updatedTags);
    updateAgentPolicy({ global_data_tags: updatedTags });
    console.log('Updated Global Data Tags:', updatedTags);
    setNewTag({ name: '', value: '' });
    setIsAdding(false);
    setNewTagErrors({ name: null, value: null });
  };

  const handleCancel = () => {
    setNewTag({ name: '', value: '' });
    setIsAdding(false);
    setNewTagErrors({ name: null, value: null });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTag({
      ...newTag,
      [e.target.name]: e.target.value,
    });
    setNewTagErrors({ ...newTagErrors, [e.target.name]: null });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const updatedTags = globalDataTags.map((tag, i) =>
      i === index ? { ...tag, [e.target.name]: e.target.value } : tag
    );
    setGlobalDataTags(updatedTags);
    setErrors((prevErrors) => ({
      ...prevErrors,
      [index]: { ...prevErrors[index], [e.target.name]: null },
    }));
  };

  const handleDelete = (index: number) => {
    const updatedTags = globalDataTags.filter((_, i) => i !== index);
    setGlobalDataTags(updatedTags);
    updateAgentPolicy({ global_data_tags: updatedTags });
    setEditingIndices((prevIndices) => {
      const newIndices = new Set(prevIndices);
      newIndices.delete(index);
      return newIndices;
    });
    setErrors((prevErrors) => {
      const { [index]: removedError, ...remainingErrors } = prevErrors;
      return remainingErrors;
    });
    console.log('Updated Global Data Tags:', updatedTags);
  };

  const handleEdit = (index: number) => {
    setEditingIndices((prevIndices) => new Set(prevIndices.add(index)));
    setErrors((prevErrors) => ({
      ...prevErrors,
      [index]: { name: null, value: null },
    }));
  };

  const handleSaveEdit = (index: number) => {
    const tag = globalDataTags[index];
    const { nameError, valueError, isValid } = validateTag(tag, index);

    if (!isValid) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [index]: { name: nameError, value: valueError },
      }));
      return;
    }

    const updatedTags = globalDataTags.map((t, i) =>
      i === index ? { ...tag, name: tag.name.trim(), value: tag.value.toString().trim() } : t
    );
    setGlobalDataTags(updatedTags);
    updateAgentPolicy({ global_data_tags: updatedTags });
    setEditingIndices((prevIndices) => {
      const newIndices = new Set(prevIndices);
      newIndices.delete(index);
      return newIndices;
    });
    console.log('Updated Global Data Tags:', updatedTags);
    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      delete newErrors[index];
      return newErrors;
    });
  };

  const handleCancelEdit = (index: number) => {
    setEditingIndices((prevIndices) => {
      const newIndices = new Set(prevIndices);
      newIndices.delete(index);
      return newIndices;
    });
    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      delete newErrors[index];
      return newErrors;
    });
  };

  const badgeStyle = {
    backgroundColor: '#f5f7fa',
    color: '#6a52b3',
  };

  const columns = [
    {
      field: 'name',
      name: 'Name',
      render: (name: string, item: GlobalDataTag) => {
        const index = globalDataTags.indexOf(item);
        const isEditing = editingIndices.has(index);
        const isAddingRow = isAdding && item === newTag;
        const error = isAddingRow ? newTagErrors : errors[index] || {};
        return isEditing || isAddingRow ? (
          <EuiFormRow isInvalid={!!error.name} error={error.name}>
            <EuiFieldText
              placeholder="Enter name"
              value={isEditing ? globalDataTags[index].name : newTag.name}
              name="name"
              onChange={(e) => (isEditing ? handleEditChange(e, index) : handleChange(e))}
              isInvalid={!!error.name}
            />
          </EuiFormRow>
        ) : (
          <EuiBadge style={badgeStyle}>{name}</EuiBadge>
        );
      },
    },
    {
      field: 'value',
      name: 'Value',
      render: (value: string | number, item: GlobalDataTag) => {
        const index = globalDataTags.indexOf(item);
        const isEditing = editingIndices.has(index);
        const isAddingRow = isAdding && item === newTag;
        const error = isAddingRow ? newTagErrors : errors[index] || {};
        return isEditing || isAddingRow ? (
          <EuiFormRow isInvalid={!!error.value} error={error.value}>
            <EuiFieldText
              placeholder="Enter value"
              value={isEditing ? globalDataTags[index].value.toString() : newTag.value.toString()}
              name="value"
              onChange={(e) => (isEditing ? handleEditChange(e, index) : handleChange(e))}
              isInvalid={!!error.value}
            />
          </EuiFormRow>
        ) : (
          <EuiBadge style={badgeStyle}>{value}</EuiBadge>
        );
      },
    },
    {
      actions: [
        {
          name: 'Confirm/Edit',
          render: (item: GlobalDataTag) => {
            const index = globalDataTags.indexOf(item);
            if (editingIndices.has(index) || (isAdding && item === newTag)) {
              return (
                <EuiText
                  color="primary"
                  onClick={isAdding ? handleConfirm : () => handleSaveEdit(index)}
                  style={{ cursor: 'pointer', color: '#0079a5' }}
                >
                  <EuiIcon type="checkInCircleFilled" color="primary" />
                  Confirm
                </EuiText>
              );
            }
            return (
              <EuiButtonIcon
                aria-label="Edit"
                iconType="pencil"
                onClick={() => handleEdit(index)}
              />
            );
          },
        },
        {
          name: 'Cancel/Delete',
          render: (item: GlobalDataTag) => {
            const index = globalDataTags.indexOf(item);
            if (editingIndices.has(index) || (isAdding && item === newTag)) {
              return (
                <EuiText
                  color="danger"
                  onClick={isAdding ? handleCancel : () => handleCancelEdit(index)}
                  style={{ cursor: 'pointer', color: '#BD271E' }}
                >
                  <EuiIcon type="cross" color="danger" />
                  Cancel
                </EuiText>
              );
            }
            return (
              <EuiButtonIcon
                aria-label="Delete"
                iconType="trash"
                color="danger"
                onClick={() => handleDelete(index)}
              />
            );
          },
        },
      ],
    },
  ];

  const items = isAdding ? [...globalDataTags, newTag] : globalDataTags;

  return (
    <>
      {globalDataTags.length === 0 && !isAdding ? (
        <EuiButton onClick={handleAddField} style={{ marginTop: '16px' }}>
          Add Field
        </EuiButton>
      ) : (
        <>
          <EuiBasicTable
            items={items}
            columns={columns}
            noItemsMessage="No global data tags available"
          />
          <EuiButton onClick={handleAddField} style={{ marginTop: '16px' }} isDisabled={isAdding}>
            Add Field
          </EuiButton>
        </>
      )}
    </>
  );
};

// import React, { useState } from 'react';
// import {
//   EuiBasicTable,
//   EuiButton,
//   EuiButtonIcon,
//   EuiFieldText,
//   EuiFlexGroup,
//   EuiFlexItem,
//   EuiToolTip,
//   EuiFormRow,
//   EuiIcon,
//   EuiText,
// } from '@elastic/eui';
//
// interface GlobalDataTag {
//   name: string;
//   value: string | number;
// }
//
// export const GlobalDataTagsTable: React.FC = () => {
//   const [globalDataTags, setGlobalDataTags] = useState<GlobalDataTag[]>([]);
//   const [newTag, setNewTag] = useState<GlobalDataTag>({ name: '', value: '' });
//   const [isAdding, setIsAdding] = useState(false);
//   const [editingIndices, setEditingIndices] = useState<Set<number>>(new Set());
//   const [errors, setErrors] = useState<
//     Record<number, { name: string | null; value: string | null }>
//   >({});
//
//   const handleAddField = () => {
//     setIsAdding(true);
//     setNewTag({ name: '', value: '' });
//     setErrors({});
//   };
//
//   const validateTag = (tag: GlobalDataTag, index?: number) => {
//     const trimmedName = tag.name.trim();
//     const trimmedValue = tag.value.toString().trim();
//     let nameError = null;
//     let valueError = null;
//
//     if (!trimmedName) {
//       nameError = 'Name cannot be empty';
//     } else if (/\s/.test(trimmedName)) {
//       nameError = 'Name cannot contain spaces';
//     } else if (globalDataTags.some((t, i) => i !== index && t.name === trimmedName)) {
//       nameError = 'Name must be unique';
//     }
//
//     if (!trimmedValue) {
//       valueError = 'Value cannot be empty';
//     }
//
//     return { nameError, valueError, isValid: !nameError && !valueError };
//   };
//
//   const handleConfirm = () => {
//     const { nameError, valueError, isValid } = validateTag(newTag);
//
//     if (!isValid) {
//       setErrors({ [-1]: { name: nameError, value: valueError } });
//       return;
//     }
//
//     const updatedTags = [
//       ...globalDataTags,
//       {
//         ...newTag,
//         name: newTag.name.trim(),
//         value: newTag.value.toString().trim(),
//       },
//     ];
//     setGlobalDataTags(updatedTags);
//     console.log('Updated Global Data Tags:', updatedTags);
//     setNewTag({ name: '', value: '' });
//     setIsAdding(false);
//     setErrors({});
//   };
//
//   const handleCancel = () => {
//     setNewTag({ name: '', value: '' });
//     setIsAdding(false);
//     setErrors({});
//   };
//
//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setNewTag({
//       ...newTag,
//       [e.target.name]: e.target.value,
//     });
//     setErrors({ ...errors, [-1]: { ...errors[-1], [e.target.name]: null } });
//   };
//
//   const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
//     const updatedTags = globalDataTags.map((tag, i) =>
//       i === index ? { ...tag, [e.target.name]: e.target.value } : tag
//     );
//     setGlobalDataTags(updatedTags);
//     setErrors({
//       ...errors,
//       [index]: { ...errors[index], [e.target.name]: null },
//     });
//   };
//
//   const handleDelete = (index: number) => {
//     const updatedTags = globalDataTags.filter((_, i) => i !== index);
//     setGlobalDataTags(updatedTags);
//     console.log('Updated Global Data Tags:', updatedTags);
//   };
//
//   const handleEdit = (index: number) => {
//     setEditingIndices((prevIndices) => new Set(prevIndices.add(index)));
//     setErrors({ ...errors, [index]: { name: null, value: null } });
//   };
//
//   const handleSaveEdit = (index: number) => {
//     const tag = globalDataTags[index];
//     const { nameError, valueError, isValid } = validateTag(tag, index);
//
//     if (!isValid) {
//       setErrors({ ...errors, [index]: { name: nameError, value: valueError } });
//       return;
//     }
//
//     const updatedTags = globalDataTags.map((t, i) =>
//       i === index ? { ...tag, name: tag.name.trim(), value: tag.value.toString().trim() } : t
//     );
//     setGlobalDataTags(updatedTags);
//     setEditingIndices((prevIndices) => {
//       const newIndices = new Set(prevIndices);
//       newIndices.delete(index);
//       return newIndices;
//     });
//     console.log('Updated Global Data Tags:', updatedTags);
//     setErrors({});
//   };
//
//   const handleCancelEdit = (index: number) => {
//     setEditingIndices((prevIndices) => {
//       const newIndices = new Set(prevIndices);
//       newIndices.delete(index);
//       return newIndices;
//     });
//     setErrors({});
//   };
//
//   const columns = [
//     {
//       field: 'name',
//       name: 'Name',
//       render: (name: string, item: GlobalDataTag) => {
//         const index = globalDataTags.indexOf(item);
//         const isEditing = editingIndices.has(index);
//         const isAddingRow = isAdding && item === newTag;
//         const error = errors[isAddingRow ? -1 : index] || {};
//         return isEditing || isAddingRow ? (
//           <EuiFormRow isInvalid={!!error.name} error={error.name}>
//             <EuiFieldText
//               placeholder="Enter name"
//               value={isEditing ? globalDataTags[index].name : newTag.name}
//               name="name"
//               onChange={(e) => (isEditing ? handleEditChange(e, index) : handleChange(e))}
//               isInvalid={!!error.name}
//             />
//           </EuiFormRow>
//         ) : (
//           name
//         );
//       },
//     },
//     {
//       field: 'value',
//       name: 'Value',
//       render: (value: string | number, item: GlobalDataTag) => {
//         const index = globalDataTags.indexOf(item);
//         const isEditing = editingIndices.has(index);
//         const isAddingRow = isAdding && item === newTag;
//         const error = errors[isAddingRow ? -1 : index] || {};
//         return isEditing || isAddingRow ? (
//           <EuiFormRow isInvalid={!!error.value} error={error.value}>
//             <EuiFieldText
//               placeholder="Enter value"
//               value={isEditing ? globalDataTags[index].value.toString() : newTag.value.toString()}
//               name="value"
//               onChange={(e) => (isEditing ? handleEditChange(e, index) : handleChange(e))}
//               isInvalid={!!error.value}
//             />
//           </EuiFormRow>
//         ) : (
//           value
//         );
//       },
//     },
//     {
//       name: 'Actions',
//       actions: [
//         {
//           render: (item: GlobalDataTag) => {
//             const index = globalDataTags.indexOf(item);
//             if (editingIndices.has(index)) {
//               return (
//                 <EuiFlexGroup gutterSize="s">
//                   <EuiFlexItem grow={false}>
//                     <EuiToolTip position="top" content="Confirm">
//                       <EuiText
//                         color="primary"
//                         onClick={() => handleSaveEdit(index)}
//                         style={{ cursor: 'pointer' }}
//                       >
//                         <EuiIcon type="checkInCircleFilled" color="primary" />
//                         Confirm
//                       </EuiText>
//                     </EuiToolTip>
//                   </EuiFlexItem>
//                   <EuiFlexItem grow={false}>
//                     <EuiToolTip position="top" content="Cancel">
//                       <EuiText
//                         color="danger"
//                         onClick={() => handleCancelEdit(index)}
//                         style={{ cursor: 'pointer' }}
//                       >
//                         <EuiIcon type="cross" color="danger" />
//                         Cancel
//                       </EuiText>
//                     </EuiToolTip>
//                   </EuiFlexItem>
//                 </EuiFlexGroup>
//               );
//             } else if (isAdding && item === newTag) {
//               return (
//                 <EuiFlexGroup gutterSize="s">
//                   <EuiFlexItem grow={true}>
//                     <EuiToolTip position="top" content="Confirm">
//                       <EuiText
//                         color="primary"
//                         onClick={handleConfirm}
//                         style={{ cursor: 'pointer' }}
//                       >
//                         <EuiIcon type="checkInCircleFilled" color="primary" />
//                         Confirm
//                       </EuiText>
//                     </EuiToolTip>
//                   </EuiFlexItem>
//                   <EuiFlexItem grow={true}>
//                     <EuiToolTip position="top" content="Cancel">
//                       <EuiText color="danger" onClick={handleCancel} style={{ cursor: 'pointer' }}>
//                         <EuiIcon type="cross" color="danger" />
//                         Cancel
//                       </EuiText>
//                     </EuiToolTip>
//                   </EuiFlexItem>
//                 </EuiFlexGroup>
//               );
//             }
//             return (
//               <EuiFlexGroup gutterSize="s">
//                 <EuiFlexItem grow={false}>
//                   <EuiToolTip position="top" content="Edit">
//                     <EuiButtonIcon
//                       aria-label="Edit"
//                       iconType="pencil"
//                       onClick={() => handleEdit(index)}
//                     />
//                   </EuiToolTip>
//                 </EuiFlexItem>
//                 <EuiFlexItem grow={false}>
//                   <EuiToolTip position="top" content="Delete">
//                     <EuiButtonIcon
//                       aria-label="Delete"
//                       iconType="trash"
//                       onClick={() => handleDelete(index)}
//                     />
//                   </EuiToolTip>
//                 </EuiFlexItem>
//               </EuiFlexGroup>
//             );
//           },
//         },
//       ],
//     },
//   ];
//
//   const items = isAdding ? [...globalDataTags, newTag] : globalDataTags;
//
//   return (
//     <>
//       {globalDataTags.length === 0 && !isAdding ? (
//         <EuiButton onClick={handleAddField} style={{ marginTop: '16px' }}>
//           Add Field
//         </EuiButton>
//       ) : (
//         <>
//           <EuiBasicTable
//             items={items}
//             columns={columns}
//             noItemsMessage="No global data tags available"
//           />
//           <EuiButton onClick={handleAddField} style={{ marginTop: '16px' }}>
//             Add Field
//           </EuiButton>
//         </>
//       )}
//     </>
//   );
// };
