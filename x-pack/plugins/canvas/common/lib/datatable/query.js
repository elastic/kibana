export function queryDatatable(datatable, query) {
  if (query.size) {
    datatable = {
      ...datatable,
      rows: datatable.rows.slice(0, query.size),
    };
  }

  if (query.and) {
    // Todo: figure out type of filters
    query.and.forEach(filter => {
      if (filter.type === 'exactly') {
        datatable.rows = datatable.rows.filter(row => {
          return row[filter.column] === filter.value;
        });
      }
      // TODO: Handle timefilter
    });
  }

  return datatable;
}
