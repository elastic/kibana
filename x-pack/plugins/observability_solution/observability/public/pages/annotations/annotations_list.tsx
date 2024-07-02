/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import React, { useState } from 'react';
import {
  EuiInMemoryTable,
  EuiBasicTableColumn,
  EuiTableSelectionType,
  EuiSearchBarProps,
  EuiButton,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { TagsList } from '@kbn/observability-shared-plugin/public';
import { TimestampRangeLabel } from '../../components/annotations/components/timestamp_range_label';
import { DatePicker } from './date_picker';
import { useDeleteAnnotation } from '../../components/annotations/hooks/use_delete_annotation';
import { AnnotationsListChart } from './annotations_list_chart';
import { Annotation } from '../../../common/annotations';
import { useFetchAnnotations } from '../../components/annotations/hooks/use_fetch_annotations';

export function AnnotationsList() {
  const [selection, setSelection] = useState<Annotation[]>([]);

  const [isEditing, setIsEditing] = useState<Annotation | null>(null);

  const [start, setStart] = useState('now-30d');
  const [end, setEnd] = useState('now');
  const { data, isLoading, refetch } = useFetchAnnotations({
    start,
    end,
  });

  const { mutateAsync: deleteAnnotation, isLoading: isDeleteLoading } = useDeleteAnnotation();

  const renderToolsLeft = () => {
    if (selection.length === 0) {
      return;
    }
    const onClick = async () => {
      await deleteAnnotation({ annotations: selection });
      setSelection([]);
      refetch();
    };
    return (
      <EuiButton
        data-test-subj="o11yRenderToolsLeftUsersButton"
        color="danger"
        iconType="trash"
        onClick={onClick}
        isLoading={isDeleteLoading}
      >
        {i18n.translate('xpack.observability.renderToolsLeft.deleteButtonLabel', {
          defaultMessage: 'Delete {no} annotations',
          values: { no: selection.length },
        })}
      </EuiButton>
    );
  };
  const renderToolsRight = () => {
    return [
      <DatePicker start={start} end={end} setStart={setStart} setEnd={setEnd} refetch={refetch} />,
    ];
  };
  const allTags = data?.map((obj) => obj.tags ?? []).flat() ?? [];
  const search: EuiSearchBarProps = {
    toolsLeft: renderToolsLeft(),
    toolsRight: renderToolsRight(),
    box: {
      incremental: true,
    },
    filters: [
      {
        type: 'field_value_selection',
        field: 'tags',
        name: TAGS_LABEL,
        multiSelect: true,
        options: [...new Set(allTags)].map((tag) => ({ value: tag, name: tag })),
      },
    ],
  };
  const pagination = {
    initialPageSize: 5,
    pageSizeOptions: [5, 10, 25, 50],
  };
  const selectionValue: EuiTableSelectionType<Annotation> = {
    selectable: (annot) => true,
    onSelectionChange: (annotSel) => setSelection(annotSel),
    initialSelected: selection,
  };

  const columns: Array<EuiBasicTableColumn<Annotation>> = [
    {
      field: 'message',
      name: MESSAGE_LABEL,
      sortable: true,
    },
    {
      field: '@timestamp',
      name: TIMESTAMP_LABEL,
      dataType: 'date',
      sortable: true,
      render: (timestamp: string, annotation: Annotation) => {
        return <TimestampRangeLabel annotation={annotation} />;
      },
    },
    {
      field: 'description',
      name: DESCRIPTION_LABEL,
      sortable: true,
      truncateText: true,
    },
    {
      field: 'tags',
      name: TAGS_LABEL,
      render: (tags: string[]) => <TagsList tags={tags} />,
    },
    {
      name: APPLY_TO_LABEL,
      render: (annotation: Annotation) => {
        const sloID = annotation.slo?.id;
        const serviceName = annotation.service?.name;
        const sloLabel = sloID
          ? i18n.translate('xpack.observability.columns.sloTextLabel', {
              defaultMessage: 'SLO: {sloID}',
              values: { sloID },
            })
          : '';
        const serviceLabel = serviceName
          ? i18n.translate('xpack.observability.columns.serviceLabel', {
              defaultMessage: 'Service: {serviceName}',
              values: { serviceName },
            })
          : '';

        if (!sloID && !serviceName) {
          return (
            <EuiText size="s">
              {i18n.translate('xpack.observability.columns.TextLabel', { defaultMessage: '--' })}
            </EuiText>
          );
        }

        return (
          <EuiText size="s">
            {serviceLabel}
            {sloLabel}
          </EuiText>
        );
      },
    },
    {
      actions: [
        {
          name: EDIT_LABEL,
          description: EDIT_LABEL,
          type: 'icon',
          icon: 'pencil',
          onClick: (annotation) => {
            setIsEditing(annotation);
          },
        },
      ],
    },
  ];

  return (
    <>
      <EuiSpacer size="m" />
      <EuiInMemoryTable
        childrenBetween={
          <AnnotationsListChart data={data ?? []} start={start} end={end} isEditing={isEditing} />
        }
        tableCaption={i18n.translate('xpack.observability.annotationsTableCaption', {
          defaultMessage: 'List of annotations for the selected time range.',
        })}
        items={data ?? []}
        itemId="id"
        loading={isLoading}
        columns={columns}
        search={search}
        pagination={pagination}
        sorting={true}
        selection={selectionValue}
        tableLayout="auto"
      />
    </>
  );
}

const DESCRIPTION_LABEL = i18n.translate('xpack.observability.nameLabel', {
  defaultMessage: 'Description',
});
const APPLY_TO_LABEL = i18n.translate('xpack.observability.applyTo', {
  defaultMessage: 'Apply to',
});
const EDIT_LABEL = i18n.translate('xpack.observability.editAnnotation', { defaultMessage: 'Edit' });

const TAGS_LABEL = i18n.translate('xpack.observability.tagsAnnotations', {
  defaultMessage: 'Tags',
});

const MESSAGE_LABEL = i18n.translate('xpack.observability.messageAnnotations', {
  defaultMessage: 'Message',
});

const TIMESTAMP_LABEL = i18n.translate('xpack.observability.timestampAnnotations', {
  defaultMessage: 'Timestamp',
});
